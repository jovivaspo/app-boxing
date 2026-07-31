# Design: Fix guest timer hydration mismatch (Issue #44)

## Technical Approach

One shared `useHydrated()` hook in `src/ui/hooks/`, built on `useSyncExternalStore`
(`getServerSnapshot -> false`, `getSnapshot -> true`). Both `useGuestTimerForm` and
`useGuestTimerActive` early-return from their storage-reading effect until it flips
true. Server HTML and the first client render then agree by construction, satisfying
the `ui-structure` delta ("one shared hook, not per consumer") and the
`guest-timer-start-flow` delta ("update still applied, may arrive one tick later").
No new dependency, no signature change, no route/page change.

## Architecture Decisions

### D1 — File name `src/ui/hooks/use-hydrated.ts` (kebab-case)

| Option            | Tradeoff                                                                                                    | Decision   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| `use-hydrated.ts` | Matches all 3 siblings (`use-google-auth.ts`, `use-timer-session-engine.ts`, `use-timer-configurations.ts`) | **Chosen** |
| `useHydrated.ts`  | Matches AGENTS.md's literal "hooks are camelCase" line                                                      | Rejected   |

**Rationale**: AGENTS.md's camelCase example (`useAuth.ts`) is stale relative to this
folder — the de-facto convention is 3/3 kebab-case. Local consistency wins; a lone
camelCase file would be the outlier. Exported symbol stays `useHydrated`. The module
carries `"use client"`, like every sibling.

### D2 — Gate by early-returning from the existing effect

**Choice**: `if (!isHydrated) return;` as the first statement, `isHydrated` added to the
dependency array. **Rejected**: a `useEffect`-flag variant (`useState` + `useEffect`)
— same tick count but no server-snapshot guarantee; wrapping the read in a separate
effect — extra effect for no gain; gating the render output instead of the effect —
would need `isHydrated` in the returned result, changing the hook contract.

**Rationale**: smallest diff, keeps one effect per hook, and the pre-hydration pass
never starts a `read()`, so no work is wasted or cancelled.

### D3 — Public contracts unchanged

`useGuestTimerForm({ localAdapter })` and `useGuestTimerActive({ localAdapter }, deps)`
keep their exact signatures, return types, and the A1 module-scope
`defaultLocalAdapter = createLocalTimerConfigurationAdapter()` overridable parameter.
`useHydrated()` is internal to each hook body and never surfaces in the result object.

### D4 — Existing hook tests keep passing unmodified

React uses `getServerSnapshot` only for `renderToString`/`hydrateRoot`. Testing
Library's `renderHook` mounts through `createRoot` — a plain client render with no
hydrate pass — so `getSnapshot` resolves on the very first render and `isHydrated` is
`true` before the effect ever runs. Both existing files behave exactly as today: same
number of ticks, same `waitFor` resolution. No edits needed to either file.

### D5 — The shared hook gets its own test file

Two tests in `src/ui/hooks/__tests__/use-hydrated.test.ts` (`// @vitest-environment jsdom`):
a `renderHook` test asserting `true`, and a `renderToStaticMarkup` test on a
`createElement` probe asserting the server snapshot is `false`. The second is the only
assertion that fails if `getServerSnapshot` is broken — a client-only test would pass
against a broken hook, making it worthless. Kept `.ts` (no JSX) via `createElement`.

### D6 — `cancelled` flag semantics unchanged

The early return happens before `let cancelled = false`, so the pre-hydration pass
registers no cleanup — correct, since it started no read. When `isHydrated` flips,
React runs the previous (undefined) cleanup, then the real body. `cancelled` keeps its
sole existing job: suppress `setState`/`router.replace` after unmount or adapter change.

## Data Flow

    server prerender ─→ getServerSnapshot() = false ─→ EMPTY_FORM / null in HTML
                                                            │
    hydrate (startTransition) ─→ still false ─→ effect no-ops, HTML matches
                                                            │
    hydration commits ─→ getSnapshot() = true ─→ effect reruns ─→ adapter.read()
                                                            │
                                                     setForm / setConfig | router.replace

## File Changes

| File                                                              | Action | Description                                       |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------- |
| `src/ui/hooks/use-hydrated.ts`                                    | Create | `useSyncExternalStore` hydration flag (~12 lines) |
| `src/ui/hooks/__tests__/use-hydrated.test.ts`                     | Create | Client `true` + SSR `false` tests                 |
| `src/ui/components/guest-timer-form/guest-timer-form.hook.ts`     | Modify | Gate the prefill effect                           |
| `src/ui/components/guest-timer-active/guest-timer-active.hook.ts` | Modify | Gate the read/redirect effect                     |

## Interfaces / Contracts

```ts
// src/ui/hooks/use-hydrated.ts
"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/** True only after hydration completes: the server render and the hydrating client
 *  render both see `false`, so browser-storage-derived state can be applied without
 *  a mismatch. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

```ts
// guest-timer-form.hook.ts — inside useGuestTimerForm
const isHydrated = useHydrated();

useEffect(() => {
  if (!isHydrated) return;

  let cancelled = false;

  localAdapter.read().then((existing) => {
    if (cancelled || !existing) return;
    setForm(toFormState(existing));
  });

  return () => {
    cancelled = true;
  };
}, [isHydrated, localAdapter]);
```

```ts
// guest-timer-active.hook.ts — inside useGuestTimerActive
const isHydrated = useHydrated();

useEffect(() => {
  if (!isHydrated) return;

  let cancelled = false;

  localAdapter.read().then((record) => {
    if (cancelled) return;
    if (record) {
      setConfig(record);
    } else {
      router.replace("/guest-timer");
    }
  });

  return () => {
    cancelled = true;
  };
}, [isHydrated, localAdapter, router]);
```

## Testing Strategy

| Layer           | What to Test                         | Approach                                                                           |
| --------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| Unit (new)      | `useHydrated` client value           | `renderHook` (jsdom), expect `true`                                                |
| Unit (new)      | `useHydrated` server snapshot        | `renderToStaticMarkup(createElement(Probe))`, expect `false`                       |
| Unit (existing) | Prefill, redirect, engine delegation | Both hook test files run **unmodified** — regression bar                           |
| Manual (verify) | Clean console                        | `npm run build && npm run start`, reload both routes with populated `localStorage` |

TDD order: RED `use-hydrated.test.ts` → hook → gate each consumer, existing tests green throughout.

## Threat Matrix

N/A — no routing config, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary. `router.replace` is pre-existing
in-app client navigation, unchanged by this design.

## Migration / Rollout

No migration required. Additive hook plus two guarded effects; no storage schema,
route, or public contract change. Rollback = revert the branch.

## Open Questions

None.

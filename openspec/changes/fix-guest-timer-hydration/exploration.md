# Exploration: Hydration mismatch on guest timer routes (GitHub Issue #44)

## Current State

Both guest routes are statically prerendered. Confirmed empirically with `npm run build`:

```
├ ○ /guest-timer
├ ○ /guest-timer-active
```

`src/app/guest-timer/page.tsx` and `src/app/guest-timer-active/page.tsx` are plain Server Components with no `export const dynamic`, no `cookies()`/`headers()`/`searchParams`, and no data fetching — nothing opts them out of static optimization.

### The render path

- `useGuestTimerForm` (`src/ui/components/guest-timer-form/guest-timer-form.hook.ts:51`) seeds `useState(EMPTY_FORM)` with `rounds: 0`.
- `isStartEnabled` (`guest-timer-form.hook.ts:107`) is therefore `false`, and `GuestTimerForm` renders `disabled={!isStartEnabled || isSubmitting}` (`guest-timer-form.tsx:133`).
- The prefill effect (`guest-timer-form.hook.ts:57-68`) calls `localAdapter.read()` and applies `setForm(toFormState(existing))` in the promise callback.
- `useGuestTimerActive` (`src/ui/components/guest-timer-active/guest-timer-active.hook.ts:31-46`) uses the same shape: `useState<TimerConfiguration | null>(null)`, then an effect that reads storage and either `setConfig(record)` or redirects.

### Verified against the built output

The prerendered button ships disabled, confirming the issue's root-cause paragraph:

```
$ rg -o 'type="submit"[^>]*' .next/server/app/guest-timer.html
type="submit" disabled=""
```

**Correction to the issue body:** the inline diff in the issue's Context section is inverted relative to this. It shows `disabled={null}` as the server HTML and `disabled={true}` as the client, but the prerendered file proves the server ships `disabled=""` (i.e. `true`), and the client — once the stored config loads — wants the attribute gone (`null`). The prose root-cause paragraph is correct; only the transcribed snippet is backwards. This does not change the fix.

### Mechanism

`createLocalTimerConfigurationAdapter().read()` (`src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts:25`) is `async` wrapping a synchronous `getItem` call. The value therefore arrives in a **microtask**, not synchronously inside the effect.

Under plain React semantics a post-commit effect could not corrupt an already-finished hydration. But the Next.js App Router hydrates the root inside `startTransition`, which makes hydration **concurrent and interruptible**. A microtask-resolved `setForm` can therefore land while hydration is still in flight, which is the plausible trigger for the reported console error.

Either way, today's correctness rests on a coincidence: server HTML and first client render agree only because `EMPTY_FORM`/`null` happen to equal the "no data yet" state. The issue's Direction asks for that agreement to hold _by construction_. That is the real requirement.

### Existing test coverage

Both "stored config present" paths are already covered:

- `src/ui/components/guest-timer-form/__tests__/guest-timer-form.hook.test.ts` — "should prefill the form from an existing guest configuration on mount"
- `src/ui/components/guest-timer-active/__tests__/guest-timer-active.hook.test.ts` — "should delegate to useTimerSessionEngine when read() resolves a record"

AC5 is largely satisfied already; these must keep passing rather than be rewritten.

### Port-boundary shape (AC4)

Both hooks already expose the A1 pattern the acceptance criteria require preserving: a module-scope `defaultLocalAdapter = createLocalTimerConfigurationAdapter()` with `localAdapter` as an overridable parameter, so tests inject a fake at the port boundary.

## Affected Areas

- `src/ui/components/guest-timer-form/guest-timer-form.hook.ts` — gate the storage-derived `setForm`
- `src/ui/components/guest-timer-active/guest-timer-active.hook.ts` — gate the storage-derived `setConfig`/redirect
- New shared hook (path for `sdd-design`, e.g. `src/ui/hooks/useHydrated.ts`) — the single place implementing "past hydration", so the pattern is fixed once
- The two existing hook test files — must keep passing unmodified
- `src/app/guest-timer/page.tsx`, `src/app/guest-timer-active/page.tsx` — untouched under Approach 1; rewritten under Approach 2

## Approaches

### 1. Shared `useHydrated()` via `useSyncExternalStore`

React's documented recipe for "are we past hydration": `getServerSnapshot` returns `false`, `getSnapshot` returns `true`. Both hooks gate their effect body on it.

- **Pros:** no new dependency; one ~8-line hook shared by both routes, satisfying "fixed once, not per route" literally; hook signatures and the `localAdapter` override are untouched (AC4 intact); existing tests keep passing, since `renderHook` in jsdom is a plain client render where `getSnapshot` resolves immediately; smallest diff (1 new file, ~3 lines changed per hook); `useSyncExternalStore` hydration behaviour is a documented React guarantee, so the storage-derived update provably lands after hydration completes rather than racing it.
- **Cons:** the subtree is still server-rendered — the guarantee is that server HTML and first client render agree, not that SSR output is removed.
- **Effort:** Low.

### 2. `next/dynamic` with `ssr: false`

- **Pros:** no SSR output for the subtree at all, so a mismatch is structurally impossible.
- **Cons:** `ssr: false` is not allowed inside a Server Component in the App Router, so each `page.tsx` must either become a Client Component or gain a new intermediate client wrapper — two extra files and a change to the composition-root pattern for a problem that is not about composition. Bigger blank flash while the chunk loads. It does not remove the need for the storage-read effect, so it layers on top of the fix rather than replacing it. Mocking `next/dynamic` under Vitest needs setup this codebase does not currently have.
- **Effort:** Medium.

### 3. `suppressHydrationWarning`

Excluded by the issue's "Not doing" — masks future real mismatches. Not viable.

### 4. Prefill in the `useState` initializer

Excluded by the issue, and correctly so: the initializer runs during render on both the SSR pass (no `window`) and the client hydrate pass (`window` present), which is the one variant that causes a hard, unambiguous mismatch.

## Recommendation

**Approach 1.** It is the smallest change that satisfies every acceptance criterion: one shared stdlib-only hook consumed by both hooks, no signature or port-boundary change (AC4), existing "stored config present" tests keep passing (AC5), no `suppressHydrationWarning` (AC6), and the prefill still appears one render tick later (AC3). It fits the project's YAGNI discipline — no wrapper components, no new dependency.

Out of scope, per the issue: the `Date.now()` seed in `src/ui/hooks/use-timer-session-engine.ts:72`. Same bug class, tracked separately.

## Risks

- The exact console error was not reproduced in a real browser during this exploration — only the server side was verified (static prerender + `disabled=""` in the built HTML). The concurrent-hydration mechanism above is the best-supported explanation, not a directly observed one. `sdd-verify` must close this with a real `npm run build && npm run start` reload against a populated localStorage, since "clean console" is the actual acceptance bar.
- `useSyncExternalStore`'s hydration-snapshot contract is stable and documented, but a future React/Next upgrade changing it would require re-verification. Low likelihood, not a blocker.
- Whether the shared hook needs its own test file is a `sdd-design` call; the two existing consuming-hook tests cover it indirectly.

## Ready for Proposal

Yes. Approach 1 is unambiguous and needs no clarification before `sdd-propose`.

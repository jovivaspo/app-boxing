# Proposal: Fix guest timer hydration mismatch (Issue #44)

## Intent

Both guest routes are statically prerendered (`○ /guest-timer`, `○ /guest-timer-active`). Their hooks seed empty state, then apply a `localStorage`-derived `setState` from an `async` adapter microtask. The App Router hydrates inside `startTransition`, so that update can land while hydration is still in flight — the reported console mismatch. Today's server/client agreement is coincidental (`EMPTY_FORM`/`null` happen to equal "no data yet"); Issue #44 wants it **by construction**, once, not per route.

Note: the inline diff in Issue #44's Context is inverted — the prerendered HTML ships `type="submit" disabled=""`. The issue's prose root cause is correct; the snippet is not. The fix is unaffected.

## Scope

### In Scope

- Shared `useHydrated()` hook in `src/ui/hooks/` (kebab-case, matching siblings).
- Gate the storage-derived state update in `useGuestTimerForm` and `useGuestTimerActive` behind it.
- Tests for the new hook and the gated paths, TDD-first.

### Out of Scope

- `useTimerSessionEngine`'s `Date.now()` seed (`src/ui/hooks/use-timer-session-engine.ts:72`) — same bug class, tracked separately.
- `suppressHydrationWarning`; prefill via `useState` initializer; `next/dynamic` `ssr: false` wrappers; route/page changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ui-structure`: browser-storage-derived UI state MUST be applied only after hydration, via one shared hook.
- `guest-timer-start-flow`: both guest routes hydrate without mismatch while preserving returning-guest prefill. (Its main spec is still a pending delta in the unarchived `guest-timer-single-config` change — sdd-spec must account for that.)

## Approach

`useSyncExternalStore` with `getServerSnapshot -> false` and `getSnapshot -> true` — React's documented "past hydration" contract. No new dependency, no signature change, no wrapper component. Rejected: `ssr: false` (two extra files, changes composition root, still needs the effect), `suppressHydrationWarning` (masks real mismatches, excluded by the issue), `useState` initializer (guaranteed mismatch).

## Affected Areas

| Area                                                              | Impact    | Description                       |
| ----------------------------------------------------------------- | --------- | --------------------------------- |
| `src/ui/hooks/use-hydrated.ts`                                    | New       | Shared hydration flag (~10 lines) |
| `src/ui/hooks/__tests__/use-hydrated.test.ts`                     | New       | jsdom hook test                   |
| `src/ui/components/guest-timer-form/guest-timer-form.hook.ts`     | Modified  | Gate `setForm`                    |
| `src/ui/components/guest-timer-active/guest-timer-active.hook.ts` | Modified  | Gate `setConfig`/redirect         |
| Both existing hook test files                                     | Unchanged | Must keep passing as-is           |

Forecast: ~90 changed lines against the 800-line budget. Risk: Low. Single PR.

## Risks

| Risk                                                       | Likelihood | Mitigation                                                                                                                                         |
| ---------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console error never reproduced in a real browser           | Med        | `sdd-verify` MUST run `npm run build && npm run start` and reload both routes with a populated `localStorage`; clean console is the acceptance bar |
| Gating delays prefill by one tick                          | Low        | Existing "stored config present" tests assert prefill still arrives                                                                                |
| `guest-timer-start-flow` main spec not yet merged          | Low        | sdd-spec writes the delta against the pending capability name                                                                                      |
| React/Next upgrade changes the hydration snapshot contract | Low        | Documented React behaviour; hook test fails loudly                                                                                                 |

## Rollback Plan

Revert the branch `fix/44-guest-timer-hydration`. The change is additive plus two guarded effects; no data, storage schema, or route contract changes.

## Dependencies

None. No new packages.

## Success Criteria

- [ ] `/guest-timer` reloads with a clean console with a saved guest config in `localStorage`.
- [ ] `/guest-timer-active` covered by the same shared hook, not a per-route patch.
- [ ] Prefilled values still appear (no returning-guest regression).
- [ ] Both hooks keep their `localAdapter` port-boundary override; existing hook tests pass unmodified.
- [ ] No `suppressHydrationWarning` anywhere in the diff.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` all pass.

## Proposal question round

Execution mode is `auto`, so no interactive round was run. Issue #44 enumerates all acceptance criteria; no product ambiguity remains. Assumptions open to correction: (1) the fix is technical-correctness only — no visible UX change is expected beyond the console; (2) a one-tick delay before prefill appears is acceptable; (3) the `Date.now()` seed stays deferred.

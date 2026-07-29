# Tasks: guest-timer-single-config (Issue #37)

Spec: `sdd/guest-timer-single-config/spec` (obs #135)
Design: `sdd/guest-timer-single-config/design` (obs #136)

All tasks are TDD pairs: write the failing test first, then the minimum
implementation that passes it. `[P]` = can run in parallel with the other
`[P]` tasks in the same group (no shared file, no dependency between them).
Everything else is sequential in the order listed.

## Group A — Foundation: new port + mock (sequential, blocks everything else)

1. [x] Write `src/application/ports/__mocks__/guest-timer-configuration-port.mock.ts`
       test usage is implicit (a mock has no test of its own) — but write the
       type file it must satisfy first:
       `src/application/ports/guest-timer-configuration.port.ts`
       (`GuestTimerConfigurationPort`, `GuestTimerConfigurationInput` per D1).
       Satisfies: spec "Guest Single-Record Timer Storage" (port shape).
2. [x] Add `makeGuestTimerConfigurationPort(overrides?)` to the mock file above
       (`read`/`write`/`clear`, mirrors `timer-configuration-repository-port.mock.ts`
       pattern). No test file — a pure test double.

## Group B — Adapter rewrite (sequential, depends on Group A)

3. [x] **Test first**: rewrite
       `src/infraestructure/timer-configuration/__tests__/local-timer-configuration.adapter.test.ts`
       to assert (per design "Test impact" + spec "Guest Single-Record Timer
       Storage" / "Guest Timer Name Is Fixed"):
   - `write()` persists under key `"guest-timer"`, `read()` returns it
   - second `write()` overwrites (same `id`, no array/second record)
   - `read()` resolves `null` when nothing stored, and never rejects (incl. SSR)
   - `write()` throws `InvalidTimerConfiguration` for non-positive
     `rounds`/`roundDuration`/`restDuration`
   - `write()` throws the SSR guard error when `window === undefined`
   - stored `name` is always `"Mi Timer"` regardless of caller-supplied name
   - old `"timer-configurations"` array key is never read/written/touched
     Run it — confirm it fails against the current array-shaped adapter.
4. [x] **Implement**: rewrite
       `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts`
       to the single-record `read()/write()/clear()` shape (D2 verbatim: fixed
       name, id generated once and reused, `validateTimerConfiguration` called
       directly in `write()`). Run tests from step 3 — confirm green.
       Satisfies: spec "Guest Single-Record Timer Storage", "Guest Timer Name Is Fixed".

## Group C — `useTimerConfigurations` guest branch (sequential, depends on Group B)

5. [x] **Test first**: update
       `src/ui/hooks/__tests__/use-timer-configurations.test.ts` guest-branch
       tests to use `makeGuestTimerConfigurationPort()` instead of
       `makeTimerConfigurationRepositoryPort()`: `list()` asserts `read()` called
       and result array-wrapped; `create`/`update` both assert `write()` called;
       `remove` asserts `clear()` called (ignoring `id`). Confirm failing.
6. [x] **Implement**: update `src/ui/hooks/use-timer-configurations.ts` guest
       branch to call `read`/`write`/`write`/`clear` per D3 (`toGuestTimerInput`
       helper strips `id`/`name`). Confirm green. Authenticated branch untouched.
       Satisfies: spec "Local Adapter Port Compliance" (guest side), keeps
       `TimerConfigurationOperations` interface unchanged.

## Group D — Consumer hooks (each `[P]` — independent files, both depend on Group A only)

7. [x] `[P]` **Test first**: update
       `src/ui/components/timer-active/__tests__/timer-active.hook.test.ts` —
       swap all 19 `makeTimerConfigurationRepositoryPort()` occurrences to
       `makeGuestTimerConfigurationPort()`; rewrite the two guest-specific tests
       ("resolve the guest configuration using timerId" and "redirect a guest to
       /timers when not found") to mock `read()` instead of `getById()`, assert
       `read()` is called with no id argument, and mock `read()` resolving `null`
       for the not-found case instead of a rejected `timerConfigurationNotFound`.
       Confirm failing.
8. [x] `[P]` **Implement**: update `src/ui/components/timer-active/timer-active.hook.ts`
       per D4 — inline `localAdapter.read()` resolution in the effect, drop
       `useGuestTimerConfigurationLookup` import and the try/catch (read() never
       rejects), retype `defaultLocalAdapter`/`TimerActiveDeps.localAdapter` to
       `GuestTimerConfigurationPort`. Confirm green.
       Satisfies: spec "Guest Timer Lookup by Id" (removal), "Edit target missing"
       scenario (guest redirect branch).
9. [x] `[P]` **Test first**: update
       `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts` —
       swap all 7 mock occurrences the same way as step 7. Confirm failing.
10. [x] `[P]` **Implement**: update
        `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts`
        per D5 (same inline pattern as D4). Confirm green.

## Group E — Guest form hides name field (sequential, depends on Group D step 10)

11. [x] **Test first**: since `timer-configuration-form.tsx` is presentational
        and untested per AGENTS.md convention, this step has no new unit test —
        it's covered by the existing `timer-configuration-form.hook.test.ts`
        (form state) plus manual/E2E verification of the conditional render.
        Skip to implementation.
12. [x] **Implement**: update `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`
        to wrap the name `<input>` block in `{props.isAuthenticated && (...)}` per D6.
        Satisfies: spec "Timer configuration form screen" scenario "Guest form
        hides the name field".

## Group F — Removals (each `[P]` — independent folders, depend on Groups D + E being green so no dangling imports remain)

13. [x] `[P]` Delete `src/infraestructure/actions/migrate-timer-configurations/`
        (action + `__tests__/`). Grep-confirm no remaining importer.
14. [x] `[P]` Delete `src/ui/components/timer-configuration-migration-runner/`
        (component + hook + `index.ts` + `__tests__/`).
15. [x] `[P]` Delete `src/ui/hooks/use-guest-timer-configuration-lookup.ts` +
        its `__tests__/` (safe now that Group D steps 8 and 10 no longer import it).
        Satisfies: spec "Guest Cross-Tab Migration on Login" (removal), "Guest
        Timer Lookup by Id" (removal).

## Group G — Composition root cleanup (sequential, depends on Group F step 14)

16. [x] **Test first**: update `src/app/__tests__/page.test.tsx` — remove the
        `useTimerConfigurationMigration` mock and the runner-related assertion;
        keep redirect/session-render tests. Confirm failing (missing import once
        step 17 lands, or currently passing-but-asserting-dead-behavior — run to
        baseline first).
17. [x] **Implement**: update `src/app/page.tsx` to drop the
        `TimerConfigurationMigrationRunner` import and JSX usage. Confirm green.

## Verification (sequential, depends on all groups)

18. [x] Run full suite: `npm run lint && npx tsc --noEmit && npm run test`.
        Confirm all authenticated-path tests (use-cases, Server Actions, backend
        adapter, mapper, domain) are unaffected per design's "Unaffected" list.

---

## Review Workload Forecast

Estimated changed lines (added + removed), by task group:

| Group     | Files                                                                                                                                                | Est. lines   | Nature                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------- |
| A         | port + mock (new)                                                                                                                                    | ~35          | new, low risk                                                       |
| B         | adapter + its test (full rewrite)                                                                                                                    | ~150         | rewrite, medium risk (core behavior change)                         |
| C         | `use-timer-configurations.ts` + test                                                                                                                 | ~60          | rewrite, low-medium risk                                            |
| D         | `timer-active.hook.ts`/test (19 mock-swap occurrences + 2 rewritten guest tests) + `timer-configuration-form.hook.ts`/test (7 mock-swap occurrences) | ~260         | mostly mechanical, some real behavior change (D4/D5 inline effects) |
| E         | `timer-configuration-form.tsx` conditional block                                                                                                     | ~10          | trivial, low risk                                                   |
| F         | 3 folder deletions (action+test, component+hook+index+test, hook+test)                                                                               | ~350–400     | pure deletion, mechanical, low risk                                 |
| G         | `page.tsx` + `page.test.tsx`                                                                                                                         | ~15          | trivial                                                             |
| **Total** |                                                                                                                                                      | **~880–930** |                                                                     |

**Budget risk**: this session's review budget is 400 changed lines. The
total estimate (~900) is more than double that budget in a single PR.

**Chained PRs recommended** — split along the group boundaries above,
which already double as natural dependency/rollback units:

1. **PR1 (Groups A + B + C)** — new port, adapter rewrite, hook wiring.
   ~245 lines. Core behavior change, needs real review attention.
2. **PR2 (Groups D + E)** — consumer hook inlining + form UI change.
   ~270 lines. Mechanical mock-swap dominates line count but two guest
   tests per hook carry real behavior change — flag those specifically to
   the reviewer, don't let the mechanical bulk hide them.
3. **PR3 (Groups F + G)** — pure deletions + composition-root cleanup.
   ~365–415 lines, entirely mechanical (dead code removal), lowest risk
   despite being the largest single PR — still slightly over budget on its
   own if all three folders land together; consider splitting F into two
   commits within the same PR (migration runner+action vs. lookup hook) if
   the reviewer wants smaller diffs, though a deletion-only PR is generally
   safe to review as one unit regardless of line count.

**Decision needed before apply**: yes — confirm the 3-PR chained split
above (or an alternative grouping) before `sdd-apply` starts, since
`delivery_strategy=ask-on-risk` and every single-PR grouping of this change
exceeds the 400-line budget.

**Dependency bottleneck**: Group F (deletions) must land after Group D is
green, since `timer-active.hook.ts` and `timer-configuration-form.hook.ts`
are the only callers of `useGuestTimerConfigurationLookup` — deleting it
first would break the build mid-refactor. This forces PR3 to depend on PR2
merging first (and PR2 on PR1), so the three PRs are strictly sequential,
not independently mergeable.

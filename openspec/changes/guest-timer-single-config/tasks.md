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

---

# Addendum — Issue #37 follow-up (2026-07-29)

Spec: `sdd/guest-timer-single-config/spec` (obs #135, addendum sections)
Design: `sdd/guest-timer-single-config/design` (obs #136, addendum section)
Proposal addendum: `proposal.md` § "Addendum — Issue #37 comments"

Groups A–G above are **completed history on the shipped part of PR #38** —
do not renumber or re-touch them. Groups H onward are new work, shipped as
follow-up commits on the same branch/PR #38 per explicit user decision.
Same TDD/`[P]` conventions as above.

## Group H — Domain: `validateGuestTimerConfiguration` (sequential, no deps)

1. [x] **Test first**: add cases to
       `src/domain/errors/__tests__/timer-configuration-errors.test.ts` —
       `validateGuestTimerConfiguration` passes when `rounds > 0 &&
 roundDuration > 0` regardless of `restDuration` (incl. `0`); throws
       `InvalidTimerConfiguration` when `rounds <= 0` or `roundDuration <= 0`;
       never reads/validates `restDuration`. Confirm failing.
2. [x] **Implement**: add `validateGuestTimerConfiguration` to
       `src/domain/errors/timer-configuration-errors.ts` — generic over
       `Pick<TimerConfiguration, "rounds" | "roundDuration">`, checks only
       those two fields, throws the same `InvalidTimerConfiguration`. Confirm
       green. Satisfies: spec "START persists and navigates" (guest-only
       validation rule), design addendum decision #1.

## Group I — Adapter: `GUEST_NAME` fix + validator swap (sequential, depends on H)

3. [x] **Test first**: update
       `src/infraestructure/timer-configuration/__tests__/local-timer-configuration.adapter.test.ts` —
       stored `name` is now `"Guest timer"` (not `"Mi Timer"`); `write()`
       succeeds with `restDuration = 0` as long as `rounds > 0 &&
 roundDuration > 0`; still throws for `rounds <= 0` or `roundDuration
 <= 0`. Confirm failing.
4. [x] **Implement**: update
       `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts` —
       `GUEST_NAME = "Guest timer"`; `write()` calls
       `validateGuestTimerConfiguration` instead of
       `validateTimerConfiguration`. Confirm green. Satisfies: spec "Guest
       Timer Name Is Fixed" (name correction), design addendum decision #2.

## Group J — Extract `useTimerSessionEngine` (sequential, depends on nothing new; do before K/O)

5. [x] **Test first**: create
       `src/ui/hooks/__tests__/use-timer-session-engine.test.ts` — move all
       tick/cue/warning/start/pause/resume/stop coverage currently living in
       `timer-active.hook.test.ts` (200ms tick, visibility-change recompute,
       bell ring on phase transition, warning threshold, no double-ring under
       a StrictMode double-invoked effect, `primaryLabel`/`primaryIcon`/
       `onPrimaryAction` mapping, `stop()` invokes the injected `onStop`
       callback) against `useTimerSessionEngine(config, onStop, deps?)`.
       Confirm failing (hook doesn't exist yet).
6. [x] **Implement**: create `src/ui/hooks/use-timer-session-engine.ts` —
       extract the ~120-line tick effect + start/pause/resume/stop callbacks
       verbatim out of `timer-active.hook.ts`, generalizing the hardcoded
       `router.push("/timers")` into the `onStop` param; the engine takes a
       non-null `config` (caller already resolved it) so it owns no
       `"loading"`/`"error"` status branch. Confirm green. Satisfies: design
       addendum decision #3.

## Group K — Revert `useTimerActive` to authenticated-only (sequential, depends on J)

7. [x] **Test first**: rewrite
       `src/ui/components/timer-active/__tests__/timer-active.hook.test.ts` —
       drop all guest/`localAdapter` mocks and the two guest-lookup tests;
       assert the hook delegates to `useTimerSessionEngine` with
       `initialConfiguration` and an `onStop` that calls
       `router.push("/timers")`; do not re-assert tick/cue behavior already
       covered by Group J's engine test (avoid duplicate coverage). Confirm
       failing.
8. [x] **Implement**: rewrite `timer-active.hook.ts` to accept
       `{ initialConfiguration: TimerConfiguration }` — drop
       `isAuthenticated`/`timerId`/`guestConfig`/`configError`/`localAdapter`
       entirely, delegate to `useTimerSessionEngine`. Update
       `timer-active.types.ts`: `TimerActiveProps` ->
       `{ initialConfiguration: TimerConfiguration }` (non-null), drop
       `TimerActiveDeps.localAdapter`, drop `"error"` from
       `TimerActiveStatus`. Confirm green.
9. [x] **Implement** (no test — presentational): update
       `timer-active.tsx` — remove the `if (status === "error")` block
       (unreachable now that `TimerActiveStatus` drops `"error"`). Satisfies:
       spec "Active timer screen" (revert), "No guest path through this
       route".

## Group L — Revert `useTimerConfigurationForm` to authenticated-only (sequential, same pattern as K, independent files)

10. [x] **Test first**: rewrite
        `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts` —
        drop all guest/`localAdapter` mocks and the guest-resolution effect
        test; `TimerConfigurationFormProps` shrinks to
        `{ initialConfiguration: TimerConfiguration | null }` (no
        `isAuthenticated`/`timerId`). Confirm failing.
11. [x] **Implement**: rewrite `timer-configuration-form.hook.ts` — drop the
        guest-resolution `useEffect`, `isAuthenticated`/`timerId`/
        `localAdapter` params entirely; `ops = useTimerConfigurations(true)`
        (Server Action calls only, no runtime branch). Update
        `timer-configuration-form.types.ts`: `TimerConfigurationFormProps` ->
        `{ initialConfiguration: TimerConfiguration | null }`. Confirm green.
12. [x] **Implement** (no test — presentational): update
        `timer-configuration-form.tsx` — remove the
        `{props.isAuthenticated && (...)}` name-field wrapper added in Group
        E; the name input is unconditional again. Satisfies: spec "Timer
        configuration form screen (create + edit)" (revert).

## Group M — Revert the three route files to authenticated-only (each `[P]`, depends on K for the active route, L for new/edit)

13. [x] `[P]` Update `src/app/timers/new/page.tsx` — drop the session-branch
        entirely; `redirect("/login")` when no session (mirror
        `src/app/page.tsx`), else render
        `<TimerConfigurationForm initialConfiguration={null} />`.
14. [x] `[P]` Update `src/app/timers/[id]/edit/page.tsx` — remove the
        `if (!session)` guest branch, `redirect("/login")` instead; keep the
        authenticated `getById`/`notFound()` path unchanged; render
        `<TimerConfigurationForm initialConfiguration={initialConfiguration} />`.
15. [x] `[P]` Update `src/app/timers/[id]/active/page.tsx` — remove the
        `if (!session)` guest branch, `redirect("/login")` instead; render
        `<TimerActive initialConfiguration={initialConfiguration} />`.
        Satisfies: spec "Timer configuration form screen", "Active timer
        screen" (revert), design addendum decision #4.

## Group N — New `/guest-timer` route + `guest-timer-form` component (sequential, depends on I)

16. [ ] **Test first**:
        `src/ui/components/guest-timer-form/__tests__/guest-timer-form.hook.test.ts` —
        form state (rounds, round/rest minutes+seconds, `warnBeforeEnd`,
        `bellSound`); START disabled matrix per spec scenarios (no input;
        rounds-only; duration-only; both present with `restDuration = 0` ->
        enabled); START click calls the injected
        `GuestTimerConfigurationPort.write()` then
        `router.push("/guest-timer-active")`. Confirm failing.
17. [ ] **Implement**: `guest-timer-form.hook.ts` + `.types.ts` — own form
        state, `isStartEnabled = rounds > 0 && roundDuration > 0`
        (`restDuration` never a condition), `handleStart` writes via the
        injected port then navigates. Confirm green.
18. [ ] **Implement** (no test — presentational): `guest-timer-form.tsx` +
        `index.ts` — same field layout as `timer-configuration-form.tsx`
        minus the `name` input, primary action labeled START and
        disabled/enabled per hook state.
19. [ ] **Implement** (no test — composition root):
        `src/app/guest-timer/page.tsx` — unconditional render of
        `<GuestTimerForm />`, no session resolution (guest-only route).
        Satisfies: spec "Guest configuration route (`/guest-timer`)", "START
        button enabled state", "START persists and navigates".

## Group O — New `/guest-timer-active` route + `guest-timer-active` component (sequential, depends on J + N)

20. [ ] **Test first**:
        `src/ui/components/guest-timer-active/__tests__/guest-timer-active.hook.test.ts` —
        on mount, `localAdapter.read()` resolving a record delegates to
        `useTimerSessionEngine(record, onStop)`; resolving `null` calls
        `router.replace("/guest-timer")` and never calls the engine. Confirm
        failing.
21. [ ] **Implement**: `guest-timer-active.hook.ts` + `.types.ts` — mirrors
        the shape of the old guest branch but delegates tick/cue logic to the
        shared engine; `onStop = () => router.push("/guest-timer")`. Confirm
        green.
22. [ ] **Implement** (no test — presentational): `guest-timer-active.tsx` +
        `index.ts` — reuses `timer-active.tsx`'s markup for
        loading/running/paused/finished states only (no `"error"` state).
23. [ ] **Implement** (no test — composition root):
        `src/app/guest-timer-active/page.tsx` — unconditional render of
        `<GuestTimerActive />`, no session resolution. Satisfies: spec "Guest
        active route (`/guest-timer-active`)", "Guard redirects when no
        guest configuration exists".

## Group P — Close the `/timers` list dead-link gap (sequential, depends on M — guest has nowhere to land from this list once new/edit/active revert)

24. [ ] **Test first**: update
        `src/ui/components/timer-configuration-list/__tests__/timer-configuration-list.hook.test.ts` —
        drop the `isAuthenticated` param/guest-branch tests; hook always
        resolves through the authenticated path. Confirm failing.
25. [ ] **Implement**: `timer-configuration-list.hook.ts` + `.types.ts` +
        `.tsx` — drop the `isAuthenticated` prop entirely, always call
        `useTimerConfigurations(true)`. Confirm green.
26. [ ] **Implement**: `src/app/timers/page.tsx` — drop the guest-branch
        session read; `redirect("/login")` when no session (mirror Group M),
        else render `<TimerConfigurationList />` (no prop). Update
        `src/app/__tests__/page.test.tsx`'s sibling test only if it asserts
        `/timers` guest behavior.
27. [ ] **Cleanup** (test-first, depends on step 25 removing the last
        `isAuthenticated=false` caller): update
        `src/ui/hooks/__tests__/use-timer-configurations.test.ts` to drop all
        guest-branch cases, confirm failing against the still-branching
        hook, then simplify `src/ui/hooks/use-timer-configurations.ts` —
        drop the `isAuthenticated` param and the entire guest branch
        (`toGuestResult`/`toGuestTimerInput`/`localAdapter` plumbing); grep-
        confirm no remaining `useTimerConfigurations(false` call exists
        before deleting. Confirm green. Satisfies: this addendum's stated
        gap ("no reason for a guest to see a Mis Timers list") — closes it
        by reverting the list to authenticated-only rather than leaving a
        dead-linking guest branch, and removes the now-unreachable guest
        path in `use-timer-configurations.ts` instead of leaving dead code
        behind.

## Group Q — `TimerActiveStatus` "error" removal verification (sequential, quick, after K)

28. [ ] Grep the codebase for `"error"` usages tied to
        `TimerActiveStatus`/`configError`/`UseTimerActiveResult.error` to
        confirm nothing outside `timer-active.hook.ts`/`.types.ts`/`.tsx`
        (already handled in Group K) still references the removed variant.
        `guest-timer-active` (Group O) needs no `"error"` status of its own —
        its "no record" case is a `router.replace` guard, not a rendered
        error screen, so the type is fully unused after Group K, not merely
        narrowed.
29. [ ] Confirm via `npx tsc --noEmit` (Group R) that no stale `"error"`
        reference remains; no code change expected if step 28 was thorough.

## Verification (sequential, depends on all groups)

30. [ ] Run full suite: `npm run lint && npx tsc --noEmit && npm run test`.
        Confirm authenticated-path tests are unaffected, new guest-route/hook
        tests are green, and no orphaned imports remain from the reverted
        guest branches.

---

## Review Workload Forecast (addendum)

Estimated changed lines (added + removed), by task group:

| Group     | Files                                                                                                              | Est. lines | Nature                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------- |
| H         | `timer-configuration-errors.ts` + test                                                                             | ~30        | new, low risk                                              |
| I         | adapter + test                                                                                                     | ~40        | small fix + validator swap, low-medium risk                |
| J         | new `use-timer-session-engine.ts` + test (extraction, not new logic)                                               | ~260       | mechanical extraction, medium risk (shared by 2 consumers) |
| K         | `timer-active.hook.ts`/`.types.ts`/`.tsx` + test (revert)                                                          | ~180       | revert, medium risk (status/type narrowing)                |
| L         | `timer-configuration-form.hook.ts`/`.types.ts`/`.tsx` + test (revert)                                              | ~150       | revert, low-medium risk                                    |
| M         | 3 route files                                                                                                      | ~60        | mechanical, low risk                                       |
| N         | new `guest-timer-form/*` (hook+types+tsx+index+test) + `app/guest-timer/page.tsx`                                  | ~220       | new, medium risk (new user-facing flow)                    |
| O         | new `guest-timer-active/*` (hook+types+tsx+index+test) + `app/guest-timer-active/page.tsx`                         | ~200       | new, medium risk (engine delegation + guard)               |
| P         | `timer-configuration-list.hook.ts`/`.types.ts`/`.tsx` + `app/timers/page.tsx` + `use-timer-configurations.ts`/test | ~150       | revert + dead-code removal, low-medium risk                |
| Q         | grep verification only                                                                                             | ~0         | verification, no diff                                      |
| **Total** |                                                                                                                    | **~1290**  |                                                            |

**Budget risk**: `review_budget_lines=400` is informational only for this
session per preflight — this addendum is already understood to exceed it,
consistent with the size:exception already accepted for PR #38. The addendum
total (~1290 lines) is itself larger than the original change's full
estimate (~900 lines) and does not fit any single 400-line slice; noting
this as risk, not blocking, per session instructions.

**New risk vs. the original change**: this addendum reverses part of what
Groups A–G already shipped (guest branching inside `/timers/new`,
`/timers/[id]/edit`, `/timers/[id]/active`, and now also `/timers` itself)
and replaces it with new dedicated routes — a reviewer diffing PR #38 end-to-
end will see churn (branch added then removed) rather than a clean
incremental history. Recommend calling this out explicitly in the PR
description so the reviewer reads it as "corrected scope," not as ping-
ponging design.

**Dependency bottleneck**: Group J (engine extraction) blocks both K and O —
`useTimerActive` and the new `useGuestTimerActive` both consume it, so it
must land and be green before either reverts/builds on top. Group M depends
on K (active route) and L (new/edit routes). Group P depends on M (the list
only becomes safely revertable once guests have nowhere left to be
deep-linked from it). Step 27 (deleting the guest branch of
`use-timer-configurations.ts`) must be the last step in P, since it is the
one truly destructive sub-step and depends on step 25 removing the only
remaining `isAuthenticated=false` caller. Net effect: H/I can run first and
in parallel with nothing; J is a hard gate before K/L/M/N/O/P can safely
finish; the addendum is not meaningfully parallelizable across more than 2–3
people at once despite the `[P]` markers within Group M.

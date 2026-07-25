# Tasks: Migrate Local Timer Configurations on Login (Issue #20)

## Review Workload Forecast

| Field                   | Value                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Estimated changed lines | ~535 (action+test ~220, gate+hook+types+barrel+test ~265, page.tsx/page.test.tsx ~50) |
| 400-line budget risk    | High                                                                                  |
| Chained PRs recommended | Yes                                                                                   |
| Suggested split         | PR 1 (Server Action) → PR 2 (Gate UI + page wiring)                                   |
| Delivery strategy       | single-pr                                                                             |
| Chain strategy          | pending (needs user decision)                                                         |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Single-pr was the received strategy, but the estimate (~535) is ~34% over the 400-line budget. Per the Review Workload Guard, `single-pr` requires an explicit `size:exception` before apply, OR the user picks a chain strategy (stacked-to-main / feature-branch-chain) and the two work units below ship as separate PRs.

### Suggested Work Units

| Unit | Goal                                                | Likely PR | Notes                                                                          |
| ---- | --------------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| 1    | `migrate-timer-configurations` Server Action + test | PR 1      | ~220 lines; base `main`/tracker; independent, no UI dep                        |
| 2    | Migration gate component/hook + `page.tsx` wiring   | PR 2      | ~315 lines; base = PR 1 branch if stacked; depends on Unit 1's exported action |

## Phase 1: Migration Server Action (Unit 1)

- [x] 1.1 RED: `migrate-timer-configurations.action.test.ts` — no session (`session.get()` → `null`) → every item `{id,status:"failed"}`, no throw. (Graceful degradation — missing token)
- [x] 1.2 GREEN: implement session check in `migrate-timer-configurations.action.ts` to pass 1.1.
- [x] 1.3 RED: test — `BACKEND_URL` unset (adapter factory throws sync) → all items failed, action doesn't throw. (Graceful degradation — unreachable backend)
- [x] 1.4 GREEN: wrap adapter construction in try/catch to pass 1.3.
- [x] 1.5 RED: test — mixed items (one succeeds, one fails) → each resolves independently, id-echoed status per item. (Per-item creation + per-item outcome identification)
- [x] 1.6 GREEN: implement per-item loop, independent try/catch, `const {id, ...candidate} = config` strip-then-echo, to pass 1.5.
- [x] 1.7 RED: test — empty input array → resolves `[]`, no adapter/use-case call.
- [x] 1.8 GREEN: confirm/adjust loop handles empty input to pass 1.7 (likely no-op given 1.6).

## Phase 2: Migration Gate UI (Unit 2, depends on Phase 1's action)

- [x] 2.1 Create `timer-configuration-migration-gate.types.ts` — `children: ReactNode` prop, `{ isMigrating: boolean }` hook result.
- [x] 2.2 RED: hook test — empty local list → no call to `migrateTimerConfigurations`, settles immediately. (Trigger point — no local configs)
- [x] 2.3 GREEN: implement `useTimerConfigurationMigration` — `localAdapter.list()` in effect, settle if empty.
- [x] 2.4 RED: hook test — non-empty list → calls action with list; migrated ids call `localAdapter.delete(id)`; failed ids are not deleted. (Idempotent cleanup + partial-failure retention)
- [x] 2.5 GREEN: implement action call + per-item conditional delete to pass 2.4.
- [x] 2.6 RED: hook test — `delete()` rejects for a migrated id → swallowed, hook still settles, no throw escapes.
- [x] 2.7 GREEN: `.catch(() => {})` each delete call to pass 2.6.
- [x] 2.8 RED: hook test — `isMigrating` is `true` until every item resolves, then `false`. (Blocking render)
- [x] 2.9 GREEN: adjust state transition only if 2.8 fails (verify — likely already satisfied).
- [x] 2.10 Create `timer-configuration-migration-gate.tsx` — renders `null` while `isMigrating`, else `children` (not tested, per project rule).
- [x] 2.11 Create `index.ts` barrel exporting `TimerConfigurationMigrationGate`.

## Phase 3: Wiring

- [x] 3.1 Modify `src/app/page.tsx` — wrap the authenticated `<main>` in `<TimerConfigurationMigrationGate>`.
- [x] 3.2 Update `src/app/__tests__/page.test.tsx` — mock the migration hook/module so the existing session-render assertion stays deterministic; add an assertion that the gate wraps the authenticated content.

## Phase 4: Verification

- [x] 4.1 Run `npm run lint`, `npx tsc --noEmit`, `npm run test` — full suite green.
- [x] 4.2 Cross-check every spec scenario (trigger point, per-item creation, idempotent cleanup, partial-failure retention, no merge/dedup, blocking render, silent operation, graceful degradation, per-item outcome ID) maps to a task above.

## Dependency & Parallelism Notes

- Phase 1 has no dependency on Phase 2/3 — can ship as PR 1 alone.
- Phase 2 imports the Phase 1 action (mocked in its own tests) — implement after 1.6, but its own RED/GREEN pairs are independent of Phase 1's internals.
- Phase 3 requires Phase 2's barrel export.
- Within each phase, RED strictly precedes its paired GREEN (project-wide TDD rule).

---

# PR #29 Fix Round — R1 + R2 (post-review fixes, design revision 2)

Addendum to the 23 tasks above (all `[x]`, already landed on the open PR #29 branch). Fixes two confirmed `claude-pr-review` findings before merge — see Engram `sdd/migrate-local-timer-configurations-on-login/design` (id 97, revision 2). No new PR: both fixes land on the existing PR #29 branch (`feat/20-migrate-local-timer-configurations-on-login`).

## Review Workload Forecast (fix round)

| Field                   | Value                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| Estimated changed lines | ~200 (R1 rename+hook+tsx+types+barrel+tests ~130, R2 action+test ~70) |
| 400-line budget risk    | Low                                                                   |
| Chained PRs recommended | No                                                                    |
| Delivery strategy       | single-pr — landing on the already-open PR #29, not a new PR          |
| Chain strategy          | n/a (well under budget)                                               |

Decision needed before apply: No. Both fixes are small, touch disjoint files (R1: `ui/components/timer-configuration-migration-*`, `app/page.tsx`; R2: `infraestructure/actions/migrate-timer-configurations/`), and stay far under the 400-line guard — no `size:exception` needed.

### Work Units

| Unit | Goal                                                    | Files touched                                                                                                               | Depends on |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| R1   | Drop the blocking gate; render `<main>` unconditionally | `ui/components/timer-configuration-migration-gate/**` (renamed to `-runner`), `app/page.tsx`, `app/__tests__/page.test.tsx` | none       |
| R2   | Server Action batch cap + Zod boundary shape validation | `infraestructure/actions/migrate-timer-configurations/**`                                                                   | none       |

R1 and R2 touch disjoint files (UI vs. infrastructure) — safe to implement/commit in either order or in parallel.

## Phase 5: R1 — Drop the blocking gate, fix SSR/no-JS blank page

- [x] 5.1 RED: in the (about-to-be-renamed) hook test, replace every `result.current.isMigrating` assertion with an assertion on mock-call state (`migrateTimerConfigurationsMock`, `deleteMock`, `listMock` — already used elsewhere in the same file via `waitFor`); delete the "reports isMigrating as true synchronously" test and fold the "settles when migrateTimerConfigurations rejects outright" test's coverage into the existing delete-swallow test (no assertion is only reachable through the dropped state). Run — fails wherever an assertion still expects a return value.
- [x] 5.2 GREEN: `git mv timer-configuration-migration-gate/ timer-configuration-migration-runner/` (directory + every file inside, `-gate` → `-runner` in filenames); in `timer-configuration-migration-runner.hook.ts`, drop `useState`/`isMigrating`, change the return type to `void`; migration body (Web Locks request, `list()`, action call, delete-on-success, error swallowing) stays verbatim.
- [x] 5.3 Delete `timer-configuration-migration-runner.types.ts` — both `UseTimerConfigurationMigrationResult` and `TimerConfigurationMigrationGateProps` are unused once 5.2 lands and the `.tsx` drops `children` (5.4).
- [x] 5.4 Rewrite `timer-configuration-migration-runner.tsx` — no `children` prop, renders `null` unconditionally, only calls `useTimerConfigurationMigration()` for its effect (not tested — presentational, project rule).
- [x] 5.5 Update `index.ts` barrel — export `TimerConfigurationMigrationRunner` from `./timer-configuration-migration-runner`.
- [x] 5.6 RED: `page.test.tsx` — delete the "withholds the authenticated content while the migration gate is still migrating" test (it specs the exact regression being fixed); add/adjust an assertion that `¡Hola, {name}!` renders regardless of what the mocked `useTimerConfigurationMigration` returns (mock it as a no-op returning `undefined`). Update the `vi.mock` path to `.../timer-configuration-migration-runner/timer-configuration-migration-runner.hook`. Run — fails against the still-gated `page.tsx`.
- [x] 5.7 GREEN: `page.tsx` — render `<main>` directly (unconditional, no wrapper) and `<TimerConfigurationMigrationRunner />` as a sibling in a fragment; update the import path to the renamed component.
- [x] 5.8 Verify the two retained `page.test.tsx` cases (redirect-to-login, session-render) still pass unmodified, and add/confirm an assertion that the runner mock was invoked (proves it's still mounted, just no longer gating).

## Phase 6: R2 — Server Action batch cap + Zod boundary validation

- [x] 6.1 RED: `migrate-timer-configurations.action.test.ts` — new test: a 51-item `configs` array resolves every item `failed`, and neither `createCookieSessionAdapterMock` (session `.get()`) nor `createBackendTimerConfigurationAdapterMock` is called. Run — fails (no cap exists yet).
- [x] 6.2 GREEN: add `const MAX_MIGRATION_BATCH = 50;` to `migrate-timer-configurations.action.ts`; add `if (configs.length > MAX_MIGRATION_BATCH) return allFailed(configs);` before `createCookieSessionAdapter().get()` (order relative to the existing empty-check is unconstrained, but this guard must precede any cookie/backend IO).
- [x] 6.3 RED: new test — `configs = [itemMissingRounds, validItem]` (e.g. `{ ...buildTimerConfiguration(), rounds: undefined }` cast through) resolves `[{id, status:"failed"}, {id, status:"migrated"}]`; `executeMock` is called exactly once, only for the valid item. Run — fails (no shape validation yet, the malformed item currently reaches `create()`).
- [x] 6.4 GREEN: add a Zod object schema mirroring `TimerConfiguration`'s shape (`id: z.string()`, `name: z.string()`, `rounds: z.number()`, `roundDuration: z.number()`, `restDuration: z.number()`, `warnBeforeEnd: z.boolean()`, `bellSound: z.boolean()` — type/presence only, no `>0` business rule, that stays in `validateTimerConfiguration`); inside `migrateOne`, `safeParse` the config first — on failure, return `{ id: config?.id, status: "failed" }` without calling `create`.
- [x] 6.5 Confirm the two existing malformed-config tests (`null` config, with and without a session) still pass unmodified — a `null` fails `safeParse` the same way it fails `create()` today, same observable result.
- [x] 6.6 Confirm the strip-then-echo test and the mixed-outcome per-item test still pass unmodified (Zod validation is additive, ahead of the existing per-item try/catch).

## Phase 7: Verification (fix round)

- [x] 7.1 Run `npm run lint`, `npx tsc --noEmit`, `npm run test` — full suite green.
- [x] 7.2 Cross-check both PR-review findings are each covered by at least one RED test above: R1 (SSR/no-JS blank page — 5.6/5.7), R2 (unbounded batch — 6.1/6.2; malformed shape — 6.3/6.4).
- [x] 7.3 Confirm the diff touches only `ui/components/timer-configuration-migration-runner/**`, `app/page.tsx`, `app/__tests__/page.test.tsx`, and `infraestructure/actions/migrate-timer-configurations/**` — no port/adapter/domain files changed (design constraint: only render gating and Server Action input handling change).

## Dependency & Parallelism Notes (fix round)

- Phase 5 (UI) and Phase 6 (Server Action) touch disjoint files — fully parallel, no ordering constraint between them.
- Within each phase, RED strictly precedes its paired GREEN (project-wide TDD rule).
- Phase 7 depends on both Phase 5 and Phase 6 being complete.

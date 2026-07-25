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

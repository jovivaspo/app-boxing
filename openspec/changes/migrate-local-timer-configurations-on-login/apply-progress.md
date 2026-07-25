# Apply Progress: Migrate Local Timer Configurations on Login (Issue #20)

**Mode**: Strict TDD
**Delivery**: single-pr with `size:exception` (explicitly accepted by the user; forecast was High-risk ~535 lines, actual diff ~458 lines). Implemented as ONE cohesive change, not split.
**Status**: 23/23 tasks complete. All 4 phases done in this single apply batch (no prior apply-progress existed).

## Completed Tasks (all)

### Phase 1: Migration Server Action

- [x] 1.1-1.8 — `migrateTimerConfigurations` Server Action, full RED/GREEN cycle.

### Phase 2: Migration Gate UI

- [x] 2.1-2.11 — `useTimerConfigurationMigration` hook (full RED/GREEN cycle) + presentational `TimerConfigurationMigrationGate` (not tested, per project rule) + types + barrel.

### Phase 3: Wiring

- [x] 3.1-3.2 — `page.tsx` wraps authenticated `<main>` in the gate; `page.test.tsx` updated with hook mock + new "withholds content while migrating" test.

### Phase 4: Verification

- [x] 4.1 — `npm run lint` (0 errors, 8 pre-existing unrelated warnings), `npx tsc --noEmit` (clean), `npm run test` (144/144 passing, 27 files).
- [x] 4.2 — every spec scenario cross-checked against implemented tests.

## Files Changed

| File                                                                                                             | Action   | What Was Done                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action.ts`                | Created  | `migrateTimerConfigurations(configs)` Server Action. Fail-closed (no session or missing `BACKEND_URL` -> all `failed`, never throws). Per-item independent try/catch, strips local `id` before `createTimerConfiguration`, echoes local `id` in result. Empty input short-circuits before touching session/adapter. |
| `src/infraestructure/actions/migrate-timer-configurations/__tests__/migrate-timer-configurations.action.test.ts` | Created  | 5 tests: no-session, no-BACKEND_URL, mixed outcomes + id echo, candidate strips `id`, empty input no-op.                                                                                                                                                                                                            |
| `src/ui/components/timer-configuration-migration-gate/timer-configuration-migration-gate.types.ts`               | Created  | `TimerConfigurationMigrationGateProps` (children), `UseTimerConfigurationMigrationResult` (isMigrating).                                                                                                                                                                                                            |
| `src/ui/components/timer-configuration-migration-gate/timer-configuration-migration-gate.hook.ts`                | Created  | `useTimerConfigurationMigration(localAdapter = defaultLocalAdapter)` — A1 exception: module-level default `createLocalTimerConfigurationAdapter()`, overridable param. Effect: `list()` -> settle if empty -> else call action -> `delete()` (best-effort, swallowed) for migrated ids -> settle.                   |
| `src/ui/components/timer-configuration-migration-gate/__tests__/timer-configuration-migration-gate.hook.test.ts` | Created  | 4 tests: empty list settles without calling action, calls action + deletes only migrated ids, swallows delete rejection, isMigrating starts true.                                                                                                                                                                   |
| `src/ui/components/timer-configuration-migration-gate/timer-configuration-migration-gate.tsx`                    | Created  | Presentational: renders `null` while `isMigrating`, else `children`. Not tested (project rule).                                                                                                                                                                                                                     |
| `src/ui/components/timer-configuration-migration-gate/index.ts`                                                  | Created  | Barrel exporting `TimerConfigurationMigrationGate`.                                                                                                                                                                                                                                                                 |
| `src/app/page.tsx`                                                                                               | Modified | Authenticated `<main>` now wrapped in `<TimerConfigurationMigrationGate>`.                                                                                                                                                                                                                                          |
| `src/app/__tests__/page.test.tsx`                                                                                | Modified | Mocks `useTimerConfigurationMigration` hook module directly; existing render test sets `isMigrating: false`; new test asserts content is withheld when `isMigrating: true`.                                                                                                                                         |

## TDD Cycle Evidence

| Task      | Test File                                                      | Layer                           | Safety Net                                                                                                                                                                              | RED                                                                                           | GREEN                                                         | TRIANGULATE                                                                | REFACTOR                                                                                    |
| --------- | -------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1.1-1.8   | `migrate-timer-configurations.action.test.ts`                  | Unit                            | N/A (new)                                                                                                                                                                               | Confirmed via `vitest run` — module-not-found error before implementation                     | Confirmed via `vitest run` — 5/5 passing                      | 5 cases (no-session, no-BACKEND_URL, mixed, id-strip, empty)               | Clean — no refactor needed, extracted `allFailed`/`migrateOne` helpers during initial write |
| 2.1-2.9   | `timer-configuration-migration-gate.hook.test.ts`              | Unit (jsdom, renderHook)        | N/A (new)                                                                                                                                                                               | Confirmed via `vitest run` — import resolution error before implementation                    | Confirmed via `vitest run` — 4/4 passing                      | 4 cases (empty, mixed migrated/failed, delete-rejects, initial-true state) | Clean — no refactor needed                                                                  |
| 2.10-2.11 | N/A (not tested, project rule: presentational `.tsx` untested) | N/A                             | N/A                                                                                                                                                                                     | N/A                                                                                           | Verified via full suite + manual review                       | ➖ Single (structural, renders null/children)                              | Clean                                                                                       |
| 3.1-3.2   | `page.test.tsx`                                                | Integration (jsdom, RSC render) | Ran existing 2 tests before edit — both passed as baseline; after `page.tsx` edit, 1 failed as expected (RED) because gate defaults to `isMigrating: true` and no hook mock existed yet | Confirmed via `vitest run` — existing render assertion failed after wiring, before mock added | Confirmed via `vitest run` — 3/3 passing (existing 2 + 1 new) | 2 cases (isMigrating false -> renders; isMigrating true -> withheld)       | Clean                                                                                       |

### Test Summary

- **Total tests written**: 9 new (5 action + 4 hook) + 1 new page test = 10 new tests
- **Total tests passing**: 144/144 (full suite)
- **Layers used**: Unit (9 new: 5 action + 4 hook), Integration (1 new page test + 2 existing updated)
- **Approval tests**: None — `page.tsx` refactor was additive wrapping, not behavior-preserving refactor; safety net run (baseline 2/2 passing) served the same purpose
- **Pure functions created**: `allFailed`, `migrateOne` (both pure aside from the injected `create` callback)

## Deviations from Design

None — implementation matches design exactly (action DTO echoes local id, gate blocks render via null, A1/A2 exceptions applied as specified, fail-closed on missing session/BACKEND_URL).

## Issues Found

None.

## Workload / PR Boundary

- Mode: single PR with `size:exception`
- Current work unit: both Unit 1 (Server Action) and Unit 2 (Gate UI + wiring) — delivered together per user's explicit exception
- Boundary: this batch starts from a clean main-based branch and ends with the full feature (all 4 phases) complete and verified
- Estimated review budget impact: ~458 changed lines (65 modified + 393 new), ~14% over the 400-line budget but within the accepted exception

## Status

23/23 tasks complete. Ready for verify.

## Judgment Day Fixes (post-apply, pre-merge)

Two confirmed issues from Judgment Day review, both TDD (RED test added, then GREEN fix):

1. **CRITICAL — no concurrency guard in the migration hook.** Strict Mode double mount-effect and cross-tab races could both call `migrateTimerConfigurations`, creating duplicate backend records. Fixed with a single-purpose localStorage mutex (`timer-configurations-migrating` key + 30s TTL) in `timer-configuration-migration-gate.hook.ts`: `tryAcquireMigrationLock()`/`releaseMigrationLock()`, checked before `list()`/`migrateTimerConfigurations`, released in `finally`. Not a generic locking abstraction — scoped to this one flow only (ponytail-marked).
2. **CRITICAL + WARNING — unhandled rejection chain could permanently blank the page.** (a) The hook's effect had no `try/catch`/`finally`, so any rejection (network, RPC, or the action) left `isMigrating` stuck `true` forever. (b) In the action's `migrateOne`, `const { id, ...candidate } = config` ran _before_ the `try`, so a malformed localStorage entry threw synchronously and rejected the whole `Promise.all`, violating the action's "never throws" contract and feeding directly into (a). Fixed both: destructure moved inside the `try` in `migrate-timer-configurations.action.ts` (catch returns `{ id: config?.id, status: "failed" }`); hook's effect body wrapped in `try { ... } catch { } finally { releaseMigrationLock(); if (!cancelled) setIsMigrating(false); }`.

Regression tests added (3 new, suite now 147/147):

- `timer-configuration-migration-gate.hook.test.ts`: "should not run a second concurrent migration while one is in flight" (lock), "should settle isMigrating to false when migrateTimerConfigurations rejects outright" (defense-in-depth catch/finally).
- `migrate-timer-configurations.action.test.ts`: "should resolve a malformed config entry as failed instead of throwing" (guard against synchronous destructure throw).

Verified green: `npm run lint` (0 errors, same 8 pre-existing warnings), `npx tsc --noEmit` (clean), `npm run test` (147/147, 27 files).

No other findings from the review were touched (delete-error duplicate risk, `/profile` scope, telemetry, concurrency cap, duplicated fast-path, adapter `delete()` behavior) — explicitly left untouched per user decision.

## Judgment Day Round 2 Fixes (post-apply, pre-merge)

Two confirmed issues from a second Judgment Day round, both TDD (RED test added, then GREEN fix):

1. **CRITICAL x2 (combined, same root cause) — the Round 1 localStorage lock reintroduced the exact "page blocked forever" bug it was meant to fix, plus never truly waited for the winner.** (a) `tryAcquireMigrationLock()` was called before the `try` block, so a `localStorage` throw (Safari "Block All Cookies", quota exceeded) rejected `migrate()` before `finally` ran, leaving `isMigrating` stuck `true` forever. (b) The lock's "loser" branch (`if (!tryAcquireMigrationLock())`) bailed out immediately instead of waiting for the in-flight migration to finish, breaking the "block until every item resolves" requirement (reproduces under React Strict Mode's double mount-effect and genuine multi-tab races). Fixed by deleting the entire hand-rolled lock (`tryAcquireMigrationLock`, `releaseMigrationLock`, `MIGRATION_LOCK_KEY`, `MIGRATION_LOCK_TTL_MS`) and replacing it with the native Web Locks API: the whole list/migrate/delete body now runs inside `await navigator.locks.request(LOCK_NAME, async () => { ... })`, itself wrapped in the outer `try { ... } catch { } finally { if (!cancelled) setIsMigrating(false); }`. Web Locks auto-releases on resolve or throw (no manual release, no TTL, no ownership token), and a losing invocation genuinely waits for the winner's callback to settle before running its own — at which point it lists again, finds nothing left (already deleted by the winner), and settles quickly. `navigator.locks` isn't implemented in jsdom, so the test file adds a minimal queueing stub (`createNavigatorLocksStub`, installed via `Object.defineProperty(navigator, "locks", ...)` in `beforeEach`) that runs a lock name's callbacks sequentially, proving genuine waiting rather than a premature bail-out.
2. **WARNING — `allFailed()` lacked the optional chaining already applied to `migrateOne`'s catch branch.** `config.id` (no `?.`) would throw a `TypeError` on a malformed/null entry hitting the no-session or missing-`BACKEND_URL` path, violating the action's own "never throws" contract. Fixed by changing to `config?.id`, matching `migrateOne`.

Regression tests added/updated (suite now 148/148):

- `timer-configuration-migration-gate.hook.test.ts`: replaced the old localStorage-flag-based concurrency test with "should make a losing invocation genuinely wait for the winner before finding nothing left to migrate" (proves real waiting via the Web Locks stub — second invocation's `list()` only fires after the first's callback settles, and `migrateTimerConfigurations` is called exactly once — no duplicate migration, no premature bail-out). Existing "reject settles isMigrating to false" and other tests kept, now running under the Web Locks stub (installed globally in `beforeEach`); the `window.localStorage.clear()` in `afterEach` was removed since the lock no longer uses `localStorage`.
- `migrate-timer-configurations.action.test.ts`: added "should resolve a malformed config entry hitting the no-session path as failed instead of throwing" — asserts `{ id: undefined, status: "failed" }` via the `allFailed` path specifically (no session), not the already-covered `migrateOne` path.

Files changed (Round 2):

- `src/ui/components/timer-configuration-migration-gate/timer-configuration-migration-gate.hook.ts` — deleted the localStorage lock; wrapped the migration body in `navigator.locks.request(LOCK_NAME, ...)`; kept the outer try/catch/finally around the whole thing.
- `src/ui/components/timer-configuration-migration-gate/__tests__/timer-configuration-migration-gate.hook.test.ts` — added `createNavigatorLocksStub`, `beforeEach` installing it, replaced the concurrency test.
- `src/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action.ts` — `allFailed`: `config.id` → `config?.id`.
- `src/infraestructure/actions/migrate-timer-configurations/__tests__/migrate-timer-configurations.action.test.ts` — added the `allFailed`-path malformed-entry test.

Left untouched per explicit user decision: `id: undefined` vs `id: string` type mismatch, no timeout on the migration Server Action call, and everything already left untouched from Round 1.

Verified green: `npm run lint` (0 errors, same 8 pre-existing warnings), `npx tsc --noEmit` (clean), `npm run test` (148/148, 27 files).

## PR #29 Fix Round — R1 + R2 (design revision 2, id 97; tasks revision 3, id 98)

Two confirmed `claude-pr-review` findings fixed before merge, landing on the already-open PR #29 branch (no new PR). Phase 5 (R1, UI) and Phase 6 (R2, Server Action) touch disjoint files.

### Phase 5 — R1: drop blocking gate, fix SSR/no-JS blank page

Finding: `TimerConfigurationMigrationGate` initialized `isMigrating=true` and only flipped it in a `useEffect` (never on SSR), returning `null` while pending — every authenticated load of `/` rendered blank HTML on SSR and permanently for no-JS clients (greeting, profile link, logout omitted). Product decision: home page content never depends on migration completion; migrate as a pure fire-and-forget background effect.

- [x] 5.1 RED — rewrote `timer-configuration-migration-runner.hook.test.ts`: dropped all `isMigrating` assertions in favor of mock-call-state assertions (`waitFor` on `list`/`migrateTimerConfigurations`/`delete` mocks); deleted the "reports isMigrating true synchronously" test; the "genuine waiting" concurrency test now asserts `listMock`/`migrateTimerConfigurationsMock` call counts instead of `result.current.isMigrating`.
- [x] 5.2 GREEN — `git mv timer-configuration-migration-gate/ -> timer-configuration-migration-runner/` (every file renamed `-gate-` -> `-runner-`); hook dropped `useState`/`isMigrating`/the `cancelled` guard entirely, now returns `void`; migration body (Web Locks request, `list()`, action call, delete-on-success) unchanged verbatim.
- [x] 5.3 — deleted `timer-configuration-migration-runner.types.ts` (both `UseTimerConfigurationMigrationResult` and `TimerConfigurationMigrationGateProps` became unused).
- [x] 5.4 — rewrote `.tsx`: no `children` prop, renders `null` unconditionally, only calls the hook for its effect (untested, presentational, per project rule).
- [x] 5.5 — `index.ts` barrel now exports `TimerConfigurationMigrationRunner`.
- [x] 5.6 RED — rewrote `page.test.tsx`: deleted the "withholds content while migrating" test; the render test now mocks the hook to return `undefined` and asserts the greeting renders regardless; `vi.mock` path updated to `.../timer-configuration-migration-runner/timer-configuration-migration-runner.hook`.
- [x] 5.7 GREEN — `page.tsx`: `<main>` now renders directly and unconditionally; `<TimerConfigurationMigrationRunner />` mounted as a sibling inside a fragment, not wrapping content.
- [x] 5.8 — verified redirect/session-render tests still pass; runner-hook mock invocation still asserted (mounted, not gating).

### Phase 6 — R2: Server Action batch cap + Zod boundary validation

Finding: `migrateTimerConfigurations` is a network-callable POST for any valid session cookie, with no cap on `configs.length` and no shape validation before fanning out one backend `create()` call per item via `Promise.all`.

- [x] 6.1 RED — added test: 51-item `configs` array -> every item resolves `failed`, zero session/cookie/backend adapter calls (verified via `getMock`/`createCookieSessionAdapterMock`/`createBackendTimerConfigurationAdapterMock`/`executeMock` all uncalled).
- [x] 6.2 GREEN — added `const MAX_MIGRATION_BATCH = 50` (ponytail-marked single hardcoded constant, not configurable) and a `configs.length > MAX_MIGRATION_BATCH -> allFailed(configs)` guard placed BEFORE `createCookieSessionAdapter().get()` — an oversized call triggers no cookie IO and no backend calls.
- [x] 6.3 RED — added test: `[malformed (rounds: undefined), valid]` -> `[failed, migrated]`, `executeMock` called exactly once (only for the valid item).
- [x] 6.4 GREEN — added `timerConfigurationShapeSchema` (Zod v4 `z.object`, type/presence only — id/name as string, rounds/roundDuration/restDuration as number, warnBeforeEnd/bellSound as boolean; the `>0` business rule intentionally stays in the domain's `validateTimerConfiguration`, applied inside `createTimerConfiguration`). `migrateOne` now runs `timerConfigurationShapeSchema.safeParse(config)` first; on failure returns `{ id: config?.id, status: "failed" }` without calling `create`, preserving the existing `config?.id` fallback pattern for genuinely malformed (e.g. `null`) entries.
- [x] 6.5 — confirmed the two existing null-config tests (with and without session) still pass unmodified — a `null` config now fails Zod's `safeParse` before the destructure ever runs, same observable outcome as before.
- [x] 6.6 — confirmed the strip-then-echo test and the existing mixed-outcome per-item test still pass unmodified.

### Phase 7 — Verification (fix round)

- [x] 7.1 — `npm run lint` (0 errors, same 8 pre-existing unrelated warnings), `npx tsc --noEmit` (clean), `npm run test` (148/148, 27 files — net zero: -1 hook test, -1 page test, +2 action tests).
- [x] 7.2 — both PR-review findings each covered by a RED test: R1 by 5.6/5.7 (page renders unconditionally test), R2 cap by 6.1/6.2, R2 shape by 6.3/6.4.
- [x] 7.3 — diff scope confirmed limited to `src/ui/components/timer-configuration-migration-runner/**` (renamed from `-gate/`), `src/app/page.tsx`, `src/app/__tests__/page.test.tsx`, `src/infraestructure/actions/migrate-timer-configurations/**`, plus the `openspec/` mirror files — no port/adapter/domain files touched.

Files changed (fix round):

- `src/ui/components/timer-configuration-migration-gate/**` renamed to `src/ui/components/timer-configuration-migration-runner/**` (index.ts, `.hook.ts`, `.tsx`, `__tests__/.hook.test.ts`); `.types.ts` deleted.
- `src/app/page.tsx` — renders `<main>` unconditionally + `<TimerConfigurationMigrationRunner />` sibling.
- `src/app/__tests__/page.test.tsx` — updated mock path and assertions for unconditional rendering.
- `src/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action.ts` — added `MAX_MIGRATION_BATCH` cap guard and Zod shape validation in `migrateOne`.
- `src/infraestructure/actions/migrate-timer-configurations/__tests__/migrate-timer-configurations.action.test.ts` — added cap-exceeded and shape-invalid-sibling tests.

Left untouched, as scoped: Web Locks mutual exclusion, delete-on-success idempotency, fail-closed session/BACKEND_URL handling, and the deferred `MigratedItemResult.id: string` type nit.

Verified green: `npm run lint` (0 errors, 8 pre-existing warnings), `npx tsc --noEmit` (clean), `npm run test` (148/148, 27 files).

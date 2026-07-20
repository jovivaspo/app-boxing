# Tasks: Local + Backend adapters for TimerConfigurationRepository (Issue #19)

## Review Workload Forecast

| Field                   | Value                                                                      |
| ----------------------- | -------------------------------------------------------------------------- |
| Estimated changed lines | ~625 (util 105, dto 20, mapper 55, local adapter 155, backend adapter 290) |
| 400-line budget risk    | High                                                                       |
| Chained PRs recommended | Yes                                                                        |
| Suggested split         | PR 1 (guest path) → PR 2 (backend path)                                    |
| Delivery strategy       | auto-chain (user-confirmed, resolved from single-pr after budget breach)   |
| Chain strategy          | stacked-to-main (user-confirmed)                                           |

Decision needed before apply: Resolved — chained, stacked-to-main.
Chained PRs recommended: Yes
400-line budget risk: High

Single-pr was confirmed conditional on staying within the ~400-line budget. Estimate is ~625 lines (56% over), so per the Review Workload Guard the user chose to split into 2 stacked PRs rather than accept `size:exception`.

### Suggested Work Units

| Unit | Goal                                                         | Likely PR | Notes                                                            |
| ---- | ------------------------------------------------------------ | --------- | ---------------------------------------------------------------- |
| 1    | `local-storage.util` + local adapter (guest path complete)   | PR 1      | ~260 lines; base `main` or tracker branch; independent of Unit 2 |
| 2    | `dto` + `mapper` + backend adapter (logged-in path complete) | PR 2      | ~365 lines; base = PR 1 branch if chained, else independent      |

## Phase 1: Storage Utility (`jsdom`) — can run in parallel with Phase 2

- [x] 1.1 RED: `storage/__tests__/local-storage.util.test.ts` — round-trip set/get, missing/malformed key → `undefined`, remove, SSR no-op (`typeof window === "undefined"`).
- [x] 1.2 GREEN: `storage/local-storage.util.ts` — implement `getItem`/`setItem`/`removeItem` to pass 1.1.

## Phase 2: DTO + Mapper (node) — can run in parallel with Phase 1

- [ ] 2.1 `timer-configuration/dto/timer-configuration.dto.ts` — Zod object schema + inferred `TimerConfigurationDto` (declarative, no dedicated test; exercised via 2.3/4.x).
- [ ] 2.2 RED: `mappers/__tests__/timer-configuration.mapper.test.ts` — `toTimerConfiguration(dto)` field mapping.
- [ ] 2.3 GREEN: `mappers/timer-configuration.mapper.ts` — implement to pass 2.2.

## Phase 3: Local Adapter (`jsdom`, depends on Phase 1)

- [x] 3.1 RED: adapter test — `create()` assigns `crypto.randomUUID()` id, persists, resolves with record.
- [x] 3.2 GREEN: implement `create()` in `local-timer-configuration.adapter.ts`.
- [x] 3.3 RED: adapter test — `list()` returns all stored configs, `[]` when none.
- [x] 3.4 GREEN: implement `list()`.
- [x] 3.5 RED: adapter test — `update()` replaces an existing record; rejects `timerConfigurationNotFound(id)` when missing.
- [x] 3.6 GREEN: implement `update()` (happy + not-found branch).
- [x] 3.7 RED: adapter test — `delete()` removes an existing record; rejects `timerConfigurationNotFound(id)` when missing.
- [x] 3.8 GREEN: implement `delete()` (happy + not-found branch).
- [x] 3.9 RED: adapter test — SSR guard: `list()` → `[]`; `update()`/`delete()` → `timerConfigurationNotFound`; nothing throws raw.
- [x] 3.10 GREEN: adjust adapter only if 3.9 fails (util SSR guard should already cover this). — not needed, all 3 SSR tests passed with no adapter change.

## Phase 4: Backend Adapter (node, stubs `fetch`, depends on Phase 2)

- [ ] 4.1 RED: adapter test — factory throws when `BACKEND_URL` is unset (fail-closed).
- [ ] 4.2 GREEN: implement `BACKEND_URL` read + throw in `createBackendTimerConfigurationAdapter()`.
- [ ] 4.3 RED: adapter test — `create()` `POST /api/v1/timer-configurations` with JSON body; 200/201 → mapped `TimerConfiguration`.
- [ ] 4.4 GREEN: implement `create()`.
- [ ] 4.5 RED: adapter test — `list()` `GET /` → mapped `TimerConfiguration[]`.
- [ ] 4.6 GREEN: implement `list()`.
- [ ] 4.7 RED: adapter test — `update()` `PUT /{id}` → mapped result; 404 → `timerConfigurationNotFound(id)`.
- [ ] 4.8 GREEN: implement `update()` (happy + 404 branch).
- [ ] 4.9 RED: adapter test — `delete()` `DELETE /{id}` resolves; 404 → `timerConfigurationNotFound(id)`.
- [ ] 4.10 GREEN: implement `delete()` (happy + 404 branch).
- [ ] 4.11 RED: adapter test — network reject / non-404 non-2xx / malformed JSON / Zod-fail → throws generic `Error` for each op.
- [ ] 4.12 GREEN: implement shared try/catch + status/JSON/Zod handling across all four methods to pass 4.11.

## Dependency & Parallelism Notes

- Phase 1 and Phase 2 are independent — run in parallel.
- Phase 3 requires Phase 1 complete (uses `local-storage.util`).
- Phase 4 requires Phase 2 complete (uses `dto` + `mapper`).
- Within each phase, RED must precede its paired GREEN (strict TDD); tasks are otherwise sequential per method (create → list → update → delete) to keep each diff reviewable.

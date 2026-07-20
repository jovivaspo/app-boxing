# Apply Progress: Local + Backend adapters for TimerConfigurationRepository (Issue #19)

**PR 1 of 2 (stacked-to-main chain)** — scope: Phase 1 (Storage Utility) + Phase 3 (Local Adapter).
**PR 2 of 2 (stacks on top of PR 1)** — scope: Phase 2 (DTO + Mapper) + Phase 4 (Backend Adapter).
All 4 phases (13 + 13 = 26 tasks total across #19) are now complete.

## Completed Tasks — PR 1

- [x] 1.1 RED: `storage/__tests__/local-storage.util.test.ts`
- [x] 1.2 GREEN: `storage/local-storage.util.ts`
- [x] 3.1 RED: `create()` assigns id, persists, resolves with record
- [x] 3.2 GREEN: implement `create()`
- [x] 3.3 RED: `list()` returns all / `[]` when none
- [x] 3.4 GREEN: implement `list()`
- [x] 3.5 RED: `update()` replaces existing record; rejects not-found
- [x] 3.6 GREEN: implement `update()`
- [x] 3.7 RED: `delete()` removes existing record; rejects not-found
- [x] 3.8 GREEN: implement `delete()`
- [x] 3.9 RED: SSR guard — `list()` → `[]`; `update()`/`delete()` → `timerConfigurationNotFound`; nothing throws raw
- [x] 3.10 GREEN: adjust adapter only if 3.9 fails — not needed, util's SSR guard already covered it, all 3 SSR tests passed unchanged

## Completed Tasks — PR 2 (this batch)

- [x] 2.1 `timer-configuration/dto/timer-configuration.dto.ts` — Zod schema + inferred `TimerConfigurationDto` (declarative, no dedicated test)
- [x] 2.2 RED: `mappers/__tests__/timer-configuration.mapper.test.ts` — field mapping
- [x] 2.3 GREEN: `mappers/timer-configuration.mapper.ts` — `toTimerConfiguration(dto)`
- [x] 4.1 RED: factory throws when `BACKEND_URL` unset
- [x] 4.2 GREEN: implement `BACKEND_URL` read + fail-closed throw
- [x] 4.3 RED: `create()` POST with JSON body → mapped result
- [x] 4.4 GREEN: implement `create()`
- [x] 4.5 RED: `list()` GET → mapped array
- [x] 4.6 GREEN: implement `list()`
- [x] 4.7 RED: `update()` PUT /{id} → mapped result; 404 → `timerConfigurationNotFound(id)`
- [x] 4.8 GREEN: implement `update()`
- [x] 4.9 RED: `delete()` DELETE /{id} resolves; 404 → `timerConfigurationNotFound(id)`
- [x] 4.10 GREEN: implement `delete()`
- [x] 4.11 RED: network reject / non-404 non-2xx / malformed JSON / Zod-fail → generic `Error`, all 4 ops — passed immediately, zero implementation change (each per-method GREEN already included full try/catch handling, mirroring `backend-auth.adapter.ts`)
- [x] 4.12 GREEN: shared try/catch + status/JSON/Zod handling — no new behavior needed; refactored already-passing per-method duplication into shared `requestJson`/`ensureOk`/`parseBody` helpers, re-verified green after refactor

## Files Changed — PR 1

| File                                                                                          | Action  | What Was Done                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/storage/local-storage.util.ts`                                           | Created | `getItem<T>`/`setItem<T>`/`removeItem` — SSR-guarded (`typeof window === "undefined"`), JSON parse wrapped in try/catch → `undefined` on malformed data                                                                    |
| `src/infraestructure/storage/__tests__/local-storage.util.test.ts`                            | Created | jsdom tests: round-trip, missing key, malformed JSON, remove, SSR no-op (`vi.stubGlobal("window", undefined)`)                                                                                                             |
| `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts`                | Created | `createLocalTimerConfigurationAdapter(): TimerConfigurationRepositoryPort` — single JSON blob under `"timer-configurations"` key, `crypto.randomUUID()` for ids, `timerConfigurationNotFound(id)` on missing update/delete |
| `src/infraestructure/timer-configuration/__tests__/local-timer-configuration.adapter.test.ts` | Created | jsdom tests: create+id assignment, list (populated + empty), update (happy + not-found), delete (happy + not-found), SSR guard for all three read/write paths                                                              |

## Files Changed — PR 2 (this batch)

| File                                                                                            | Action  | What Was Done                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/timer-configuration/dto/timer-configuration.dto.ts`                        | Created | `timerConfigurationDtoSchema` (Zod object: id, name, rounds, roundDuration, restDuration, warnBeforeEnd, bellSound) + inferred `TimerConfigurationDto`                                                                                                                           |
| `src/infraestructure/timer-configuration/mappers/timer-configuration.mapper.ts`                 | Created | `toTimerConfiguration(dto)` — response-only DTO→domain mapper (D7), no request-side mapping                                                                                                                                                                                      |
| `src/infraestructure/timer-configuration/mappers/__tests__/timer-configuration.mapper.test.ts`  | Created | node test: full field mapping                                                                                                                                                                                                                                                    |
| `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts`                | Created | `createBackendTimerConfigurationAdapter(): TimerConfigurationRepositoryPort` — fail-closed `BACKEND_URL` read; `requestJson`/`ensureOk`/`parseBody` shared helpers; 404→`timerConfigurationNotFound` (D5) on update/delete; all other failures → generic `Error` (D6)            |
| `src/infraestructure/timer-configuration/__tests__/backend-timer-configuration.adapter.test.ts` | Created | node test, `vi.stubGlobal("fetch", ...)`/`vi.stubEnv` pattern (mirrors `backend-auth.adapter.test.ts`): factory guard, create/list/update/delete happy paths, 404 mapping, generic-Error matrix (network reject, non-404 non-2xx, malformed JSON, Zod-fail) across all 4 methods |

## TDD Cycle Evidence

| Task      | Test File                                              | Layer        | Safety Net | RED                                                                                                                           | GREEN                                                                                                                                                               | TRIANGULATE                                        | REFACTOR                                                                                                                              |
| --------- | ------------------------------------------------------ | ------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1/1.2   | `storage/__tests__/local-storage.util.test.ts`         | Unit (jsdom) | N/A (new)  | Written                                                                                                                       | Passed (4 tests)                                                                                                                                                    | 2 extra SSR cases added                            | Clean, no changes needed                                                                                                              |
| 3.1/3.2   | `local-timer-configuration.adapter.test.ts`            | Unit (jsdom) | N/A (new)  | Written                                                                                                                       | Passed                                                                                                                                                              | Combined with 3.3 (list assertion in same test)    | Clean                                                                                                                                 |
| 3.3/3.4   | same                                                   | Unit (jsdom) | N/A        | Written (empty-list case)                                                                                                     | Passed with existing impl (no change)                                                                                                                               | — Single scenario, already covered by 3.2 impl     | Clean                                                                                                                                 |
| 3.5/3.6   | same                                                   | Unit (jsdom) | N/A        | Written (happy + not-found)                                                                                                   | Passed                                                                                                                                                              | 2 cases (happy path + missing-id reject)           | Clean                                                                                                                                 |
| 3.7/3.8   | same                                                   | Unit (jsdom) | N/A        | Written (happy + not-found)                                                                                                   | Passed                                                                                                                                                              | 2 cases                                            | Clean                                                                                                                                 |
| 3.9/3.10  | same                                                   | Unit (jsdom) | N/A        | Written (3 SSR cases: list/update/delete)                                                                                     | Passed with zero adapter changes                                                                                                                                    | 3 SSR cases                                        | None needed — util SSR guard already sufficient                                                                                       |
| 2.2/2.3   | `mappers/__tests__/timer-configuration.mapper.test.ts` | Unit (node)  | N/A (new)  | Written                                                                                                                       | Passed (1 test)                                                                                                                                                     | Single scenario — all 7 fields covered in one case | Clean                                                                                                                                 |
| 4.1/4.2   | `backend-timer-configuration.adapter.test.ts`          | Unit (node)  | N/A (new)  | Written                                                                                                                       | Passed                                                                                                                                                              | Single scenario                                    | Clean                                                                                                                                 |
| 4.3/4.4   | same                                                   | Unit (node)  | N/A        | Written                                                                                                                       | Passed                                                                                                                                                              | Single scenario                                    | Clean                                                                                                                                 |
| 4.5/4.6   | same                                                   | Unit (node)  | N/A        | Written                                                                                                                       | Passed                                                                                                                                                              | Single scenario                                    | Clean                                                                                                                                 |
| 4.7/4.8   | same                                                   | Unit (node)  | N/A        | Written (happy + 404)                                                                                                         | Passed                                                                                                                                                              | 2 cases                                            | Clean                                                                                                                                 |
| 4.9/4.10  | same                                                   | Unit (node)  | N/A        | Written (happy + 404)                                                                                                         | Passed                                                                                                                                                              | 2 cases                                            | Clean                                                                                                                                 |
| 4.11/4.12 | same                                                   | Unit (node)  | N/A        | Written (network reject / non-404 non-2xx / malformed JSON / Zod-fail, `it.each` across create/list/update/delete = 14 cases) | Passed with zero implementation change (each per-method GREEN in 4.4/4.6/4.8/4.10 already had full try/catch + Zod validation, mirroring `backend-auth.adapter.ts`) | 14 cases                                           | Extracted shared `requestJson`/`ensureOk`/`parseBody` helpers to remove the 4-way duplication; re-ran full suite green after refactor |

### Test Summary

- PR 1: 16 new tests (6 `local-storage.util.test.ts`, 10 `local-timer-configuration.adapter.test.ts`)
- PR 2: 22 new tests (1 `timer-configuration.mapper.test.ts`, 21 `backend-timer-configuration.adapter.test.ts`)
- Total new tests across #19: 38
- Total tests passing: 133/133 (full suite, 25 test files, no regressions)
- Layers used: Unit/jsdom (PR 1), Unit/node with stubbed `fetch`/`BACKEND_URL` (PR 2)
- Approval tests: None — no refactoring of existing code outside this slice
- Pure functions created: `getItem`, `setItem`, `removeItem`, `readAll` (PR 1); `toTimerConfiguration`, `requestJson`, `ensureOk`, `parseBody` (PR 2)

## Verification — PR 1

- `npm run lint`: 0 errors, 5 pre-existing-style warnings (`'_id' is assigned a value but never used` — same destructuring-omit pattern already present in `create-timer-configuration.test.ts`, consistent with codebase convention)
- `npx tsc --noEmit`: clean, no errors
- `npm run test`: 23 test files passed, 111/111 tests passed (full suite, includes pre-existing tests — none broken)

## Verification — PR 2 (this batch, final for #19)

- `npm run lint`: 0 errors, 7 pre-existing-style warnings (`'_id' is assigned a value but never used` — same convention as PR 1, 2 more instances added by this PR's own test file, consistent with existing pattern)
- `npx tsc --noEmit`: clean, no errors
- `npm run test`: 25 test files passed, 133/133 tests passed (full suite, includes PR 1 + all pre-existing tests — none broken)
- `npm run format:check` / `npx prettier --write` applied to the 5 new files created in this PR only (pre-existing repo-wide formatting drift on unrelated files, e.g. `openspec/config.yaml`, left untouched — out of scope for this change)

## Deviations from Design

None — implementation matches `openspec/changes/timer-configuration-adapters/design.md` exactly:

- D5 (backend 404 → `timerConfigurationNotFound(id)` on update/delete): implemented as designed, per the unverified-assumption flag in the design doc. Not silently changed.
- D6 (all non-404 backend failures — network, non-2xx, non-JSON, Zod-fail, missing `BACKEND_URL` — throw a generic `Error`, no new domain error): implemented as designed. Not silently changed.
- D7 (response-only mapper, no request-side DTO mapping; request bodies are domain objects via `JSON.stringify`): implemented as designed.
- Single deliberate refactor beyond the literal per-task diff: extracted `requestJson`/`ensureOk`/`parseBody` shared helpers during the 4.12 REFACTOR step to eliminate 4-way duplication across create/list/update/delete — behavior-preserving, all tests stayed green throughout.

## Status

All 26 tasks across #19 complete (12/12 PR 1: 1.1, 1.2, 3.1–3.10; 14/14 PR 2: 2.1–2.3, 4.1–4.12). Both phases of the persistence-adapter change are done. Ready for `sdd-verify`; orchestrator handles commit/PR creation for PR 2 (stacked on PR 1/#25).

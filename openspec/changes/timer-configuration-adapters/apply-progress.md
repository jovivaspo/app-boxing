# Apply Progress: Local + Backend adapters for TimerConfigurationRepository (Issue #19)

**PR 1 of 2 (stacked-to-main chain)** — scope: Phase 1 (Storage Utility) + Phase 3 (Local Adapter) only.
Phase 2 (DTO/Mapper) and Phase 4 (Backend Adapter) are explicitly OUT of scope for this PR — they land in PR 2 (stacks on top of this branch).

## Completed Tasks (this PR)

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

## Not Started (PR 2 scope — explicitly excluded from this batch)

- [ ] 2.1 `timer-configuration/dto/timer-configuration.dto.ts`
- [ ] 2.2 RED: mapper test
- [ ] 2.3 GREEN: mapper implementation
- [ ] 4.1–4.12 Backend adapter (factory guard, create/list/update/delete, error handling)

## Files Changed

| File                                                                                          | Action  | What Was Done                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/storage/local-storage.util.ts`                                           | Created | `getItem<T>`/`setItem<T>`/`removeItem` — SSR-guarded (`typeof window === "undefined"`), JSON parse wrapped in try/catch → `undefined` on malformed data                                                                    |
| `src/infraestructure/storage/__tests__/local-storage.util.test.ts`                            | Created | jsdom tests: round-trip, missing key, malformed JSON, remove, SSR no-op (`vi.stubGlobal("window", undefined)`)                                                                                                             |
| `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts`                | Created | `createLocalTimerConfigurationAdapter(): TimerConfigurationRepositoryPort` — single JSON blob under `"timer-configurations"` key, `crypto.randomUUID()` for ids, `timerConfigurationNotFound(id)` on missing update/delete |
| `src/infraestructure/timer-configuration/__tests__/local-timer-configuration.adapter.test.ts` | Created | jsdom tests: create+id assignment, list (populated + empty), update (happy + not-found), delete (happy + not-found), SSR guard for all three read/write paths                                                              |

## TDD Cycle Evidence

| Task     | Test File                                      | Layer        | Safety Net | RED                                       | GREEN                                 | TRIANGULATE                                     | REFACTOR                                        |
| -------- | ---------------------------------------------- | ------------ | ---------- | ----------------------------------------- | ------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| 1.1/1.2  | `storage/__tests__/local-storage.util.test.ts` | Unit (jsdom) | N/A (new)  | Written                                   | Passed (4 tests)                      | 2 extra SSR cases added                         | Clean, no changes needed                        |
| 3.1/3.2  | `local-timer-configuration.adapter.test.ts`    | Unit (jsdom) | N/A (new)  | Written                                   | Passed                                | Combined with 3.3 (list assertion in same test) | Clean                                           |
| 3.3/3.4  | same                                           | Unit (jsdom) | N/A        | Written (empty-list case)                 | Passed with existing impl (no change) | — Single scenario, already covered by 3.2 impl  | Clean                                           |
| 3.5/3.6  | same                                           | Unit (jsdom) | N/A        | Written (happy + not-found)               | Passed                                | 2 cases (happy path + missing-id reject)        | Clean                                           |
| 3.7/3.8  | same                                           | Unit (jsdom) | N/A        | Written (happy + not-found)               | Passed                                | 2 cases                                         | Clean                                           |
| 3.9/3.10 | same                                           | Unit (jsdom) | N/A        | Written (3 SSR cases: list/update/delete) | Passed with zero adapter changes      | 3 SSR cases                                     | None needed — util SSR guard already sufficient |

### Test Summary

- Total tests written: 14 (6 in `local-storage.util.test.ts`, 10 in `local-timer-configuration.adapter.test.ts`... actually 10 total in adapter file, 6 in util file = 16 new test cases across the 2 files)
- Total tests passing: 16/16 new (111/111 in full suite)
- Layers used: Unit/jsdom only (14 in adapter test file scoped to this PR, 6 in util test file)
- Approval tests: None — no refactoring of existing code
- Pure functions created: `getItem`, `setItem`, `removeItem`, `readAll` (private helper in adapter)

## Verification (this batch)

- `npm run lint`: 0 errors, 5 pre-existing-style warnings (`'_id' is assigned a value but never used` — same destructuring-omit pattern already present in `create-timer-configuration.test.ts`, consistent with codebase convention)
- `npx tsc --noEmit`: clean, no errors
- `npm run test`: 23 test files passed, 111/111 tests passed (full suite, includes pre-existing tests — none broken)

## Deviations from Design

None — implementation matches `openspec/changes/timer-configuration-adapters/design.md` exactly: single JSON blob under `"timer-configurations"`, `crypto.randomUUID()`, SSR guard behavior, function signatures.

## Status

12/12 assigned tasks (1.1, 1.2, 3.1–3.10) complete. Phase 2 and Phase 4 (13 tasks) remain, scoped to PR 2. Ready for `sdd-verify` on this PR's slice; orchestrator handles commit/PR creation.

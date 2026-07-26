# Apply Progress: Timer Configuration Screens (issue #21)

**What**: Slice 1 (Foundations) — committed on `feat/21-timer-configuration-screens`. Slice 2a (Result module + list + delete Server Actions) — committed. Slice 2b (create + update Server Actions) — fully implemented, ready to commit as its own PR-sized unit targeting slice 2a's branch (stacked-to-main).

**Why**: Complete the four-action Server Action surface (design D2/D6) so slice 3 (list screen) and slice 4 (form screen) can consume `create`/`update` alongside the already-landed `list`/`delete`, per the confirmed tasks artifact (obs #105) and design (obs #104).

## Slice 1 — Foundations: DONE (committed)

See prior revision — port `getById`, both adapters, mock, `get-timer-configuration` use case, `src/lib/duration.ts`, vendored shadcn `button`/`input`/`switch`.

## Slice 2a — Result module + list + delete actions: DONE (committed)

`src/application/timer-configuration/timer-configuration-result.ts` (+test), `src/infraestructure/actions/list-timer-configuration/` (+test), `src/infraestructure/actions/delete-timer-configuration/` (+test). Tasks 2.1, 2.2, 2.3 done.

## Slice 2b — Create + update actions: DONE (ready to commit)

- `src/infraestructure/actions/create-timer-configuration/create-timer-configuration.action.ts` + `__tests__/create-timer-configuration.action.test.ts` (new) — `createTimerConfigurationAction(config: Omit<TimerConfiguration, "id">)`. Body shape: zod `candidateShapeSchema` (name/rounds/roundDuration/restDuration/warnBeforeEnd/bellSound, shape-only) → session guard → `createBackendTimerConfigurationAdapter` try/catch → `createTimerConfiguration({ repository })(parsed.data)` try/catch mapping via `toTimerConfigurationErrorCode`. 4 TDD steps, all green (task 2.4, done).
- `src/infraestructure/actions/update-timer-configuration/update-timer-configuration.action.ts` + `__tests__/update-timer-configuration.action.test.ts` (new) — `updateTimerConfigurationAction(config: TimerConfiguration)`. Same shape plus `id: z.string()` in the schema; catches both `invalid-configuration` (via `InvalidTimerConfiguration`) and `not-found` (via `timerConfigurationNotFound`). 5 TDD steps, all green (task 2.5, done).

**Learned**: No deviation from design. Both actions reuse `toTimerConfigurationErrorCode`/`Result<T>` from slice 2a as-is (not redefined). Shape schemas follow the `migrate-timer-configurations.action.ts` precedent exactly — zod validates presence/type only, the `>0` business rule stays in `validateTimerConfiguration` inside the use case. Slice 2b has no cross-half coupling with 2a beyond importing the shared `Result` module, confirming the tasks artifact's "clean split" note.

**Status**: `npm run test` → 186/186 passed (34 files, up from 177/32 after slice 2a). `npx tsc --noEmit` → clean. `npm run lint` → 0 errors, 12 warnings (9 pre-existing `_id` unused-var + 3 new ones from the create action test, same pre-existing pattern, not a regression). `npx prettier --check` on both new action folders → clean.

Slice 2 (Server Actions) is now fully COMPLETE (2a + 2b).

## Slice 3 — List screen: NOT STARTED

## Slice 4 — Form screen: NOT STARTED

# Tasks: TimerConfigurationRepository port + CRUD use cases (Issue #18)

## Review Workload Forecast

| Field                   | Value                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| Estimated changed lines | ~300-360 (domain ~25, port ~15, 4 use cases ~45, 4 test files ~230-280) |
| 400-line budget risk    | Low                                                                     |
| Chained PRs recommended | No                                                                      |
| Suggested split         | Single PR                                                               |
| Delivery strategy       | single-pr                                                               |
| Chain strategy          | pending                                                                 |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                                      | Likely PR | Notes                                                                                             |
| ---- | --------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| 1    | Full change: domain id + errors, port, 4 use cases, tests | PR 1      | Single PR; base `main`. Additive-only, no adapter/UI, estimate comfortably under 400-line budget. |

Note: Phases 4-7 (create/list/update/delete use cases) touch disjoint files with no shared state — they are parallelizable across engineers. Design's TDD build order (create → list → update → delete) is the sequential-solo default, not a hard dependency; keep phases 1-3 strictly sequential first (domain → errors → port).

## Phase 1: Domain — TimerConfiguration identity (Spec: TimerConfiguration record identity)

- [x] 1.1 Add required `id: string` to `TimerConfiguration` in `src/domain/timer-configuration/timer-configuration.model.ts`.
- [x] 1.2 Add default `id` (e.g. `"tc-1"`) in `buildTimerConfiguration` at `src/domain/timer-configuration/__builders__/timer-configuration.builder.ts`.
- [x] 1.3 Run `npx tsc --noEmit` + `npm run test` — confirm `timer-configuration.model.test.ts` stays green unmodified.

## Phase 2: Domain — errors (Spec: Update/DeleteTimerConfiguration not-found error)

- [x] 2.1 In `src/domain/errors/timer-configuration-errors.ts`, add `TimerConfigurationNotFound` interface (`_tag: "TimerConfigurationNotFound"`, extends `Error`) and `timerConfigurationNotFound(id: string)` factory, mirroring `invalidTimerConfiguration`.
- [x] 2.2 Widen `validateTimerConfiguration` param/return from `TimerConfiguration` to `Omit<TimerConfiguration, "id">`.
- [x] 2.3 Run `npm run test` — confirm `timer-configuration-errors.test.ts` stays green (type-only widening).

## Phase 3: Application — port (Spec: TimerConfigurationRepository port contract)

- [x] 3.1 Create `src/application/ports/timer-configuration-repository.port.ts`: `create(config: Omit<TimerConfiguration,"id">): Promise<TimerConfiguration>`, `list(): Promise<TimerConfiguration[]>`, `update(config: TimerConfiguration): Promise<TimerConfiguration>`, `delete(id: string): Promise<void>`; `@throws {TimerConfigurationNotFound}` JSDoc on `update`/`delete`. Interface only, no test (mirrors `session.port.ts`).

## Phase 4: createTimerConfiguration (Spec: CreateTimerConfiguration use case)

- [x] 4.1 RED — `src/application/use-cases/create-timer-configuration/__tests__/create-timer-configuration.test.ts`: inline `makeRepository(overrides?)` fake; valid config validates + calls `repository.create` + returns result; invalid config throws `InvalidTimerConfiguration` and `repository.create` is never called.
- [x] 4.2 GREEN — `src/application/use-cases/create-timer-configuration/create-timer-configuration.ts`: deps-injection factory, `validateTimerConfiguration(config)` then `repository.create(config)`.

## Phase 5: listTimerConfiguration (Spec: ListTimerConfigurations use case)

- [x] 5.1 RED — `src/application/use-cases/list-timer-configuration/__tests__/list-timer-configuration.test.ts`: port returns records → returned unchanged; port returns `[]` → `[]` returned.
- [x] 5.2 GREEN — `src/application/use-cases/list-timer-configuration/list-timer-configuration.ts`: factory delegating to `repository.list()`, no validation.

## Phase 6: updateTimerConfiguration (Spec: UpdateTimerConfiguration use case)

- [x] 6.1 RED — `src/application/use-cases/update-timer-configuration/__tests__/update-timer-configuration.test.ts`: valid config validates + calls `repository.update` + returns result; invalid config throws `InvalidTimerConfiguration`, `repository.update` never called; port rejects with `timerConfigurationNotFound(id)` → propagates (`.rejects.toBe`).
- [x] 6.2 GREEN — `src/application/use-cases/update-timer-configuration/update-timer-configuration.ts`: `validateTimerConfiguration(config)` then `repository.update(config)`.

## Phase 7: deleteTimerConfiguration (Spec: DeleteTimerConfiguration use case)

- [x] 7.1 RED — `src/application/use-cases/delete-timer-configuration/__tests__/delete-timer-configuration.test.ts`: existing id → calls `repository.delete(id)`, resolves `undefined`; port rejects with `timerConfigurationNotFound(id)` → propagates.
- [x] 7.2 GREEN — `src/application/use-cases/delete-timer-configuration/delete-timer-configuration.ts`: delegates to `repository.delete(id)`, no validation.

## Phase 8: Verification (Spec: Layer isolation for repository and use cases)

- [x] 8.1 Run full gate: `npm run lint`, `npx tsc --noEmit`, `npm run test` — all green.
- [x] 8.2 Confirm the port file and all four use-case files import nothing from `src/infraestructure/` or `src/ui/`.

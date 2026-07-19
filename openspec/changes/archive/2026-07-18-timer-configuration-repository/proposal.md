# Proposal: TimerConfigurationRepository port + CRUD use cases

## Intent

Issue #18. The `TimerConfiguration` domain entity (#17) exists but nothing can persist or manage it. Add the driven port and CRUD use cases so future infrastructure adapters and UI can create, list, update, and delete saved timer configurations. A CRUD repository needs stable identity per record, which the entity currently lacks.

## Scope

### In Scope

- **Domain (deliberate, user-approved widening — see below):** add required `id: string` to `TimerConfiguration` (`src/domain/timer-configuration/timer-configuration.model.ts`); add default `id` to `buildTimerConfiguration` builder.
- `TimerConfigurationRepository` port in `src/application/ports/timer-configuration-repository.port.ts`.
- 4 use cases (own folder + `__tests__/`, no barrel): `create-`, `list-`, `update-`, `delete-timer-configuration`.
- New `timerConfigurationNotFound(id)` domain error in `src/domain/errors/timer-configuration-errors.ts` (existing `_tag` + `extends Error` pattern).

### Out of Scope

- Any infrastructure adapter implementing the port (backend/localStorage) — later issue.
- UI/management screens.
- Branded id types (no precedent; `User.id` is plain `string`).

## Capabilities

### New Capabilities

- `timer-configuration-repository`: driven port + CRUD use cases for managing persisted timer configurations, including record identity and not-found handling.

### Modified Capabilities

None (no `domain-structure`/`application-structure` requirement change; the entity `id` addition is covered by the new capability's spec).

## Approach

- Entity carries `id: string` (Option B — one type everywhere, matching `User.id`); avoids a parallel `StoredTimerConfiguration` type.
- Port methods: `create(config: Omit<TimerConfiguration, "id">): Promise<TimerConfiguration>`, `list(): Promise<TimerConfiguration[]>`, `update(config: TimerConfiguration): Promise<TimerConfiguration>`, `delete(id: string): Promise<void>`.
- `create`/`update` call existing `validateTimerConfiguration` before delegating to the port (reuse, no reimplemented checks).
- Use cases follow the deps-injection factory shape (`fn(deps){ return execute(...) }`); tests fake the port with inline `vi.fn()` helpers, mocking the port only.

## Affected Areas

| Area                                                                         | Impact   | Description                      |
| ---------------------------------------------------------------------------- | -------- | -------------------------------- |
| `src/domain/timer-configuration/timer-configuration.model.ts`                | Modified | Add `id: string`                 |
| `src/domain/timer-configuration/__builders__/timer-configuration.builder.ts` | Modified | Default `id`                     |
| `src/domain/errors/timer-configuration-errors.ts`                            | Modified | Add `timerConfigurationNotFound` |
| `src/application/ports/timer-configuration-repository.port.ts`               | New      | Port interface                   |
| `src/application/use-cases/{create,list,update,delete}-timer-configuration/` | New      | 4 use cases + tests              |

Existing domain tests use `buildTimerConfiguration()` only (no raw literals), so the builder default keeps them valid — no test edits expected.

## Scope note: deliberate domain touch

Adding `id` to `TimerConfiguration` reopens the entity merged in #17 on this branch. This is a **deliberate, user-approved decision**, not oversight or scope creep: the user explicitly chose it over a port-level intersection type. Reviewers should not flag it.

## Risks

| Risk                                                 | Likelihood | Mitigation                                                                      |
| ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| First `Repository`-shaped port sets a new convention | Med        | Lock signatures in design phase                                                 |
| Who throws not-found (port vs use case)              | Med        | Decide in design; default: use case for `delete`, adapter resolves for `update` |
| `update`/`delete` on missing id                      | Low        | `timerConfigurationNotFound(id)`                                                |

## Rollback Plan

Revert the change branch commits. No migrations, no adapters, no persisted data — pure additive port/use-case + one entity field. Reverting `id` restores #17's exact shape.

## Dependencies

- #17 (`TimerConfiguration` entity) — merged on this branch.

## Success Criteria

- [ ] `TimerConfigurationRepository` port defined; no infra/UI imports.
- [ ] 4 use cases, each with `__tests__/` mocking only the port.
- [ ] `id: string` on entity + builder; `timerConfigurationNotFound` added.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` pass.

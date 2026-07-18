# Design: TimerConfigurationRepository port + CRUD use cases

## Technical Approach

Add one driven port (`TimerConfigurationRepository`) and four deps-injection use cases behind it, following the exact `SessionPort` / `signInWithGoogle` conventions already in the repo. `id: string` lives on the domain entity (proposal Option B, user-approved), so a single `TimerConfiguration` type flows everywhere — no parallel `StoredTimerConfiguration`. `create`/`update` reuse the existing `validateTimerConfiguration` domain function; lookup failure is the adapter's responsibility. Implements the `timer-configuration-repository` capability spec.

## Architecture Decisions

### Decision: Who throws `timerConfigurationNotFound`

| Option                                                         | Tradeoff                                                                | Decision   |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| Add `get(id)` port method; use case pre-checks then throws     | Extra unused port method, TOCTOU race, existence duplicated per adapter | Rejected   |
| **Port/adapter rejects with `timerConfigurationNotFound(id)`** | Matches repo precedent; use case just propagates                        | **Chosen** |

**Rationale**: This codebase already pushes lookup/IO-failure domain errors to the adapter boundary — `AuthPort.exchange` throws `InvalidCredentials`/`BackendUnavailable` (documented via `@throws` on the port), and the use case only propagates. The application layer performs solely the input-shape validation it can do without IO (`validateTimerConfiguration`, empty-checks). "Record exists" is an IO fact only the adapter knows, so `update`/`delete` port methods reject with `timerConfigurationNotFound(id)`; the use cases add no lookup. No `get` method is introduced (nothing consumes it yet — YAGNI).

### Decision: `update` signature — single object vs `(id, config)`

**Choice**: `update(config: TimerConfiguration): Promise<TimerConfiguration>` — one arg. **Alternatives**: `(id, config)` two-arg. **Rationale**: `id` is now a field of the entity, so the config already carries it; a separate `id` arg would be redundant and risk `id !== config.id` mismatch. Mirrors `SessionPort.create(session)` (one domain object in).

### Decision: `validateTimerConfiguration` param widened to `Omit<TimerConfiguration, "id">`

**Choice**: Change its param and return type from `TimerConfiguration` to `Omit<TimerConfiguration, "id">`. **Alternatives**: keep `TimerConfiguration` (blocks `create`, whose input has no id yet). **Rationale**: `create` validates an id-less candidate; a full `TimerConfiguration` (the `update` path) remains structurally assignable to `Omit<…,"id">`, so both callers reuse one validator. Runtime behavior is unchanged (validates the same 3 numeric fields), so the existing `timer-configuration-errors.test.ts` stays green — types-only widening, in-scope with the approved domain touch.

## Data Flow

    create(cfg-no-id) ─→ validateTimerConfiguration ─→ repository.create ─→ TimerConfiguration(+id)
    update(cfg)       ─→ validateTimerConfiguration ─→ repository.update ─→ TimerConfiguration | throws NotFound
    list()            ─────────────────────────────→ repository.list   ─→ TimerConfiguration[]
    delete(id)        ─────────────────────────────→ repository.delete ─→ void | throws NotFound

## File Changes

| File                                                                         | Action | Description                                                                                                                                             |
| ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/timer-configuration/timer-configuration.model.ts`                | Modify | Add required `id: string`                                                                                                                               |
| `src/domain/timer-configuration/__builders__/timer-configuration.builder.ts` | Modify | Add default `id` (e.g. `"tc-1"`)                                                                                                                        |
| `src/domain/errors/timer-configuration-errors.ts`                            | Modify | Add `TimerConfigurationNotFound` + `timerConfigurationNotFound(id)`; widen `validateTimerConfiguration` param/return to `Omit<TimerConfiguration,"id">` |
| `src/application/ports/timer-configuration-repository.port.ts`               | Create | The driven port                                                                                                                                         |
| `src/application/use-cases/create-timer-configuration/{…}.ts` + `__tests__/` | Create | validate → `repository.create`                                                                                                                          |
| `src/application/use-cases/list-timer-configuration/{…}.ts` + `__tests__/`   | Create | passthrough `repository.list`                                                                                                                           |
| `src/application/use-cases/update-timer-configuration/{…}.ts` + `__tests__/` | Create | validate → `repository.update`                                                                                                                          |
| `src/application/use-cases/delete-timer-configuration/{…}.ts` + `__tests__/` | Create | passthrough `repository.delete`                                                                                                                         |

Kebab folders, lowercase files, sibling `__tests__/`, **no barrel `index.ts`** (per `application-structure` spec). Use-case folder suffix is singular `-timer-configuration` for all four (matches the proposal's locked folder list); `listTimerConfiguration` returns `TimerConfiguration[]`.

## Interfaces / Contracts

```ts
// src/application/ports/timer-configuration-repository.port.ts
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export interface TimerConfigurationRepository {
  create(config: Omit<TimerConfiguration, "id">): Promise<TimerConfiguration>;
  list(): Promise<TimerConfiguration[]>;
  /** @throws {import("@/domain/errors/timer-configuration-errors").TimerConfigurationNotFound} id does not resolve. */
  update(config: TimerConfiguration): Promise<TimerConfiguration>;
  /** @throws {import("@/domain/errors/timer-configuration-errors").TimerConfigurationNotFound} id does not resolve. */
  delete(id: string): Promise<void>;
}
```

`timerConfigurationNotFound(id)` follows the `_tag`-discriminated `extends Error` pattern of `invalidTimerConfiguration`: `interface TimerConfigurationNotFound extends Error { readonly _tag: "TimerConfigurationNotFound" }`.

Use-case shape (factory returning bound `execute`, `Deps` inline), e.g.:

```ts
export function createTimerConfiguration({
  repository,
}: CreateTimerConfigurationDeps) {
  return function execute(
    config: Omit<TimerConfiguration, "id">
  ): Promise<TimerConfiguration> {
    validateTimerConfiguration(config);
    return repository.create(config);
  };
}
```

## Testing Strategy

| Layer       | What to Test                                                                        | Approach                                                                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain      | `id` on builder/entity; `timerConfigurationNotFound` `_tag`; validator still throws | Existing tests stay green; no new domain test required for id (data shape)                                                                                                                                      |
| Application | Each use case orchestrates its port correctly                                       | Inline `makeRepository(overrides?)` returning `{ create/list/update/delete: vi.fn().mockResolvedValue(...) }`, `overrides` spread last — exactly the `sign-in-with-google.test.ts` pattern. Mock the port only. |

Per use case: (1) happy path asserts port called with expected args + result propagated; (2) `create`/`update` assert invalid input throws `InvalidTimerConfiguration` and the port is NOT called (`.not.toHaveBeenCalled()`); (3) all four assert a port rejection propagates (`.rejects.toBe(portError)`) — for `update`/`delete` the port error is `timerConfigurationNotFound(id)`.

## Migration / Rollout

No migration required. Pure additive port + use cases + one entity field. No adapter/UI/persisted data.

## TDD Sequence (Strict TDD active)

1. **Domain first** (use cases depend on it): add `id` to entity + builder default; add `timerConfigurationNotFound` + widen validator — run `npm run test`, existing suite green.
2. **Port**: create the interface (type-only, no test).
3. **Per use case, red→green**: write `__tests__/{name}.test.ts` (RED) → implement `{name}.ts` (GREEN). Order: `create`, `list`, `update`, `delete`.
4. Gate each step on `npm run lint` + `npx tsc --noEmit` + `npm run test`.

## Open Questions

- None blocking.

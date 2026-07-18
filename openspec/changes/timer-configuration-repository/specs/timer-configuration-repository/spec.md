# Timer Configuration Repository Specification

## Purpose

Defines the `TimerConfigurationRepositoryPort` driven port, its four CRUD use
cases, and the `id: string` identity field on `TimerConfiguration` (Issue
#18). No infrastructure adapter or UI is defined here.

## Requirements

### Requirement: TimerConfiguration record identity

The system MUST require `TimerConfiguration` to carry a required `id: string`
field, uniquely identifying each stored configuration. `buildTimerConfiguration`
MUST supply a default `id` so existing tests using the builder remain valid
unmodified.

#### Scenario: Builder produces a config with a default id

- GIVEN `buildTimerConfiguration()` is called with no overrides
- WHEN the returned value is inspected
- THEN it MUST contain a non-empty string `id` alongside the existing fields

#### Scenario: id is required, not optional

- GIVEN a value intended to satisfy the `TimerConfiguration` interface
- WHEN it is constructed without an `id`
- THEN it MUST fail to type-check

### Requirement: TimerConfigurationRepositoryPort port contract

The system MUST define a `TimerConfigurationRepositoryPort` interface-only port at
`src/application/ports/timer-configuration-repository.port.ts` with exactly:

| Method | Signature                                                                     | Responsibility                                                  |
| ------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| create | `create(config: Omit<TimerConfiguration, "id">): Promise<TimerConfiguration>` | Persists a new configuration, returns it with an assigned `id`  |
| list   | `list(): Promise<TimerConfiguration[]>`                                       | Returns all stored configurations                               |
| update | `update(config: TimerConfiguration): Promise<TimerConfiguration>`             | Persists changes to the configuration identified by `config.id` |
| delete | `delete(id: string): Promise<void>`                                           | Removes the configuration identified by `id`                    |

#### Scenario: Port is implementation-free

- GIVEN `timer-configuration-repository.port.ts`
- WHEN its contents are inspected
- THEN it MUST contain only a type/interface declaration, no adapter logic

### Requirement: CreateTimerConfiguration use case

The system MUST expose `createTimerConfiguration`, which validates input via
`validateTimerConfiguration` before delegating to the port's `create`.

#### Scenario: Valid configuration is created

- GIVEN a configuration without an `id`, with positive `rounds`,
  `roundDuration`, `restDuration`
- WHEN `createTimerConfiguration` is invoked
- THEN it MUST call `validateTimerConfiguration`, call the port's `create`,
  and return the created `TimerConfiguration`

#### Scenario: Invalid configuration is rejected before reaching the port

- GIVEN a configuration with `rounds`, `roundDuration`, or `restDuration` ≤ 0
- WHEN `createTimerConfiguration` is invoked
- THEN it MUST throw `InvalidTimerConfiguration` and MUST NOT call the port's
  `create`

### Requirement: ListTimerConfigurations use case

The system MUST expose `listTimerConfigurations`, returning the port's
`list` result unchanged.

#### Scenario: Existing configurations are returned

- GIVEN the port's `list` resolves with one or more records
- WHEN `listTimerConfigurations` is invoked
- THEN it MUST return the same records, unmodified

#### Scenario: No configurations exist

- GIVEN the port's `list` resolves with an empty array
- WHEN `listTimerConfigurations` is invoked
- THEN it MUST return an empty array

### Requirement: UpdateTimerConfiguration use case

The system MUST expose `updateTimerConfiguration`, which validates input via
`validateTimerConfiguration` before delegating to the port's `update`, and
MUST reject with `timerConfigurationNotFound(id)` when the target record does
not exist.

#### Scenario: Valid configuration is updated

- GIVEN a configuration with an existing `id` and positive `rounds`,
  `roundDuration`, `restDuration`
- WHEN `updateTimerConfiguration` is invoked
- THEN it MUST call `validateTimerConfiguration`, call the port's `update`,
  and return the updated `TimerConfiguration`

#### Scenario: Invalid configuration is rejected before reaching the port

- GIVEN a configuration with `rounds`, `roundDuration`, or `restDuration` ≤ 0
- WHEN `updateTimerConfiguration` is invoked
- THEN it MUST throw `InvalidTimerConfiguration` and MUST NOT call the port's
  `update`

#### Scenario: Updating a configuration that does not exist

- GIVEN a configuration whose `id` has no matching stored record
- WHEN `updateTimerConfiguration` is invoked
- THEN it MUST reject with `timerConfigurationNotFound(id)` (which layer
  throws it is not fixed here — see Risks)

### Requirement: DeleteTimerConfiguration use case

The system MUST expose `deleteTimerConfiguration`, delegating to the port's
`delete`, and MUST reject with `timerConfigurationNotFound(id)` when the
target record does not exist.

#### Scenario: Existing configuration is deleted

- GIVEN a stored configuration with a given `id`
- WHEN `deleteTimerConfiguration` is invoked with that `id`
- THEN it MUST call the port's `delete` with that `id` and resolve with no
  value

#### Scenario: Deleting a configuration that does not exist

- GIVEN no stored configuration matches the given `id`
- WHEN `deleteTimerConfiguration` is invoked with that `id`
- THEN it MUST reject with `timerConfigurationNotFound(id)`

### Requirement: Layer isolation for repository and use cases

The port and its four use cases MUST NOT import from `src/infraestructure/`
or `src/ui/`. The port MUST live under `src/application/ports/`; each use
case MUST live in its own kebab-case folder under
`src/application/use-cases/` with a sibling `__tests__/` folder, per the
existing Use-Case Module Folder Organization requirement.

#### Scenario: No infra or UI imports

- GIVEN the port file and the four use-case files
- WHEN their imports are inspected
- THEN none MUST import from `src/infraestructure/` or `src/ui/`

#### Scenario: Each use case tests against the port only

- GIVEN a test file for one of the four use cases
- WHEN its dependencies are inspected
- THEN it MUST mock only the `TimerConfigurationRepositoryPort` port, with no
  real infra/UI dependency

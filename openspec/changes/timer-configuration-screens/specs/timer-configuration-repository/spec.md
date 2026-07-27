## MODIFIED: TimerConfigurationRepositoryPort port contract

The system MUST define a `TimerConfigurationRepositoryPort` interface-only port at `src/application/ports/timer-configuration-repository.port.ts` with exactly:

| Method  | Signature                                                                     | Responsibility                                                                              |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| create  | `create(config: Omit<TimerConfiguration, "id">): Promise<TimerConfiguration>` | Persists a new configuration, returns it with an assigned `id`                              |
| list    | `list(): Promise<TimerConfiguration[]>`                                       | Returns all stored configurations                                                           |
| getById | `getById(id: string): Promise<TimerConfiguration>`                            | Returns the single configuration for `id`, or rejects with `timerConfigurationNotFound(id)` |
| update  | `update(config: TimerConfiguration): Promise<TimerConfiguration>`             | Persists changes to the configuration identified by `config.id`                             |
| delete  | `delete(id: string): Promise<void>`                                           | Removes the configuration identified by `id`                                                |

(Previously: port exposed only `create`, `list`, `update`, `delete` — no single-record lookup.)

#### Scenario: Port is implementation-free

- GIVEN `timer-configuration-repository.port.ts`
- WHEN its contents are inspected
- THEN it MUST contain only a type/interface declaration, no adapter logic

#### Scenario: getById is part of the required contract

- GIVEN a value intended to satisfy `TimerConfigurationRepositoryPort`
- WHEN it omits `getById`
- THEN it MUST fail to type-check

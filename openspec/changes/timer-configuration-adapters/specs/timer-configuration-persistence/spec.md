# Timer Configuration Persistence Specification

## Purpose

Defines behavior for the two adapters implementing `TimerConfigurationRepositoryPort` — a `localStorage` adapter (guest) and a backend `fetch` adapter (logged-in) — plus the `localStorage` utility module both may rely on. Covers create/list/update/delete correctness, not-found error mapping, and safe storage access. Excludes UI, routes, and composition-root wiring (out of scope).

## Requirements

### Requirement: LocalStorage Utility Safe Access

The `localStorage` utility MUST expose plain functions (`getItem`, `setItem`, `removeItem`) that never throw due to JSON errors or a missing `window`.

#### Scenario: Reading an existing key

- GIVEN a value previously stored via `setItem`
- WHEN `getItem` is called with that key
- THEN it returns the deserialized value with its original type

#### Scenario: Reading a missing or corrupted key

- GIVEN no value is stored under a key, or the stored raw string is not valid JSON
- WHEN `getItem` is called
- THEN it returns `undefined` without throwing

#### Scenario: Writing and removing a value

- WHEN `setItem` is called with a key and value
- THEN the value is JSON-serialized and persisted, retrievable via `getItem`
- WHEN `removeItem` is then called with that key
- THEN a subsequent `getItem` returns `undefined`

#### Scenario: No `window` available (SSR)

- GIVEN `typeof window === "undefined"`
- WHEN `getItem`, `setItem`, or `removeItem` is called
- THEN `getItem` returns `undefined`, `setItem`/`removeItem` no-op, and none of the three throws

### Requirement: Local Adapter Port Compliance

The `localStorage` adapter MUST implement all four `TimerConfigurationRepositoryPort` methods using the utility above as its only storage mechanism.

#### Scenario: Create persists and assigns an id

- WHEN `create(config)` is called with a config lacking `id`
- THEN the adapter assigns a generated id, persists the full record, and resolves with the persisted `TimerConfiguration`

#### Scenario: List returns all stored configurations

- GIVEN zero or more configurations persisted
- WHEN `list()` is called
- THEN it resolves with an array of exactly those configurations (`[]` if none)

#### Scenario: Update an existing configuration

- GIVEN a configuration previously created with a given id
- WHEN `update(config)` is called with that id
- THEN the adapter persists the new values and resolves with the updated `TimerConfiguration`

#### Scenario: Update or delete a missing configuration

- GIVEN no stored configuration matches the given id
- WHEN `update(config)` or `delete(id)` is called
- THEN the adapter rejects with `timerConfigurationNotFound(id)` and leaves stored data unchanged

#### Scenario: Delete an existing configuration

- GIVEN a configuration previously created with a given id
- WHEN `delete(id)` is called
- THEN it resolves and the record no longer appears in a subsequent `list()`

#### Scenario: No `window` available (SSR)

- GIVEN `typeof window === "undefined"`, so the underlying utility treats the store as empty
- WHEN `list()` is called, THEN it resolves with `[]`
- WHEN `update()` or `delete()` is called, THEN each rejects with `timerConfigurationNotFound`
- AND no method throws a raw/unhandled error

### Requirement: Backend Adapter Port Compliance

The backend adapter MUST implement all four port methods via `fetch` against `${BACKEND_URL}/api/v1/timer-configurations`, validating every response body with a Zod schema before mapping to the domain entity.

#### Scenario: BACKEND_URL not configured

- GIVEN `process.env.BACKEND_URL` is unset
- WHEN the adapter factory is invoked
- THEN it throws immediately (fail-closed), before any request is attempted

#### Scenario: Create and list

- WHEN `create(config)` is called, THEN the adapter issues `POST /api/v1/timer-configurations` with the config as JSON body
- WHEN `list()` is called, THEN the adapter issues `GET /api/v1/timer-configurations`
- AND each resolves, on success, with the mapped `TimerConfiguration`(s) after DTO validation

#### Scenario: Update and delete

- WHEN `update(config)` is called, THEN the adapter issues `PUT /api/v1/timer-configurations/{config.id}`
- WHEN `delete(id)` is called, THEN the adapter issues `DELETE /api/v1/timer-configurations/{id}`
- AND `update` resolves with the mapped `TimerConfiguration`; `delete` resolves with no value

#### Scenario: Update or delete a missing configuration

- GIVEN the backend responds with a not-found (404) status
- WHEN `update(config)` or `delete(id)` is called
- THEN the adapter rejects with `timerConfigurationNotFound(id)`

#### Scenario: Response fails DTO validation

- GIVEN a successful HTTP response whose body does not match the expected DTO shape
- WHEN any method parses that response
- THEN the adapter rejects rather than resolving with a malformed `TimerConfiguration`

## Non-Goals

- Does not cover any `app/` route, composition-root wiring, or runtime adapter selection (design note only, per proposal).
- Does not change the port, domain model, or existing errors (all merged in #18).
- Does not fix the exact error type for network failures or non-404 backend statuses — left to design.

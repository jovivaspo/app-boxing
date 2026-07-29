# Delta for Timer Configuration Persistence

## REMOVED Requirements

### Requirement: Local Adapter Port Compliance

(Reason: guest identity no longer supports id-based CRUD; replaced by single-record read/write.)
(Migration: see ADDED "Guest Single-Record Timer Storage" below. Backend adapter's identical port-compliance requirement is untouched.)

### Requirement: Guest Cross-Tab Migration on Login

(Reason: Issue #37 removes the guest-to-account migration pipeline — Web Locks coordination, `migrate-timer-configurations` Server Action, `timer-configuration-migration-runner` — as disproportionate complexity for non-durable guest data.)
(Migration: None. No Server Action or effect fires on login; old array data is abandoned in place.)

### Requirement: Guest Timer Lookup by Id

(Reason: guest timers no longer carry an application-assigned id to look up.)
(Migration: None. Guest hooks resolve the single stored record directly via `read()`.)

## ADDED Requirements

### Requirement: Guest Single-Record Timer Storage

The guest (localStorage) adapter MUST persist at most one `TimerConfiguration` under key `"guest-timer"`, via a `read()`/`write()` pair, and MUST NOT implement `create`/`list`/`getById`/`update`/`delete`. It MUST NOT read, write, or interpret the legacy array-shaped `"timer-configurations"` key.

#### Scenario: Create writes the single record

- GIVEN no record exists under `"guest-timer"`
- WHEN `write(config)` is called
- THEN the record is persisted under `"guest-timer"` and a subsequent `read()` returns it

#### Scenario: Second write overwrites, never appends

- GIVEN a record already exists under `"guest-timer"`
- WHEN `write(config)` is called again with different values
- THEN the stored record is replaced entirely; no array or second record is created

#### Scenario: Read with nothing stored

- GIVEN no value under `"guest-timer"`
- WHEN `read()` is called
- THEN it resolves with `null`

#### Scenario: Run reads the current record

- GIVEN a record stored under `"guest-timer"`
- WHEN the active-session flow resolves the guest configuration
- THEN it uses that same `read()` result, with no id parameter involved

#### Scenario: Legacy array key is never touched

- GIVEN a pre-existing array under `"timer-configurations"` from before this change
- WHEN the guest adapter performs any read or write
- THEN it MUST NOT read, parse, migrate, or delete that key

### Requirement: Guest Timer Name Is Fixed

The guest adapter MUST set `name: "Mi Timer"` on every `write()`, ignoring any caller-supplied `name`.

#### Scenario: Caller-supplied name is ignored

- GIVEN a `write(config)` call where `config.name` is anything other than `"Mi Timer"`
- WHEN the adapter persists the record
- THEN the stored `name` is `"Mi Timer"`, not the caller-supplied value

### Requirement: Authenticated Flow Parity

The backend adapter, its Server Actions, and authenticated CRUD behavior MUST remain byte-for-byte unchanged by this refactor.

#### Scenario: Authenticated CRUD unaffected

- GIVEN a valid session
- WHEN list/create/update/delete/getById are exercised against the backend adapter
- THEN behavior matches pre-change specs exactly, with existing authenticated-path tests passing unmodified

# Delta for Shared HTTP Client Refactor

## Capability Impact

Per the proposal's Capabilities section, this change is a pure internal
refactor: **no ADDED, MODIFIED, REMOVED, or RENAMED requirements** in any
existing capability. Behavior parity is the success criterion, not new
behavior. Existing specs stay authoritative and untouched:

- `openspec/specs/session-authentication/spec.md` — auth adapter's error
  mapping and `_tag` domain errors
- `openspec/specs/timer-configuration-persistence/spec.md` — timer-
  configuration adapter's error handling (D6: plain `Error`)
- `openspec/specs/infraestructure-structure/spec.md` — folder/test
  co-location, already covers the new `src/infraestructure/http/` module

## ADDED Requirements

### Requirement: Behavior parity across the httpClient extraction

Refactoring `backend-auth.adapter.ts` and
`backend-timer-configuration.adapter.ts` to use the shared `httpClient`
MUST NOT change any externally observable behavior: same thrown error
types (`_tag`s in auth, plain `Error` in timer-configuration), same `fetch`
call arguments, same status-code-to-error mapping per call site.

#### Scenario: Auth adapter preserves its error contract

- GIVEN `backend-auth.adapter.ts` refactored to call the shared `httpClient`
- WHEN its existing test suite runs against the refactored adapter
- THEN all `_tag` domain errors (`invalidCredentials`, `backendUnavailable`,
  etc.) and their triggering conditions are unchanged

#### Scenario: Timer-configuration adapter preserves its error contract

- GIVEN `backend-timer-configuration.adapter.ts` refactored to remove its
  inline `requestJson` helper and shrink `parseBody` (renamed `parseDto`) to
  drop its own JSON-parse `try/catch` — `ensureOk` stays adapter-owned
- WHEN its existing test suite runs against the refactored adapter
- THEN a plain `Error` is thrown under the same D6 conditions as before,
  including `timerConfigurationNotFound(id)` for a 404 response

### Requirement: Shared module has no domain or status-code knowledge

The new `src/infraestructure/http/` module MUST expose only
`createHttpClient()` (returning `{ get, post, put, delete }`) and its
`HttpClient` type, MUST NOT contain Zod validation, status-code branching
(401/403/404), or logging. JSON parsing is each adapter's own responsibility.

#### Scenario: Shared module surface is minimal

- GIVEN `src/infraestructure/http/`
- WHEN its exports are inspected
- THEN only `createHttpClient` and the `HttpClient` type are exported, with
  no logging calls, no JSON parsing, and no status-code conditionals inside
  the module

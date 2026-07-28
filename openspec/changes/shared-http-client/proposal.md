# Proposal: Shared httpClient for Backend Adapters

## Intent

Two backend adapters (`backend-auth.adapter.ts`, `backend-timer-configuration.adapter.ts`) each reimplement the same fetch → status-check → JSON-parse pipeline with their own try/catch scaffolding. The duplication is small today but is copied verbatim into every new adapter (fighters, gym activity are next). Extract the mechanical part once so future adapters inherit correct network/parse error handling instead of re-deriving it. Closes Issue #28. Pure refactor: no observable behavior change.

## Scope

### In Scope

- New `src/infraestructure/http/` module exposing two functions: `httpClient(url, init)` (fetch, maps only network failure to a neutral infra error, returns the raw `Response`) and `parseJsonBody(response)` (maps only JSON-parse failure, returns `unknown`).
- Refactor `backend-auth.adapter.ts` to use both; its 401/403 → `invalidCredentials()`, `!ok` → `backendUnavailable()`, and `safeParse` mapping stay in the adapter.
- Refactor `backend-timer-configuration.adapter.ts`: `requestJson`/`ensureOk`/`parseBody` are removed; `parseBody`'s fused Zod `safeParse` + generic-`Error` mapping moves back inline into each method; `ensureOk`'s conditional 404 → `timerConfigurationNotFound(id)` stays adapter-owned.
- Unit tests for the new module; both existing adapter suites keep asserting the same behavior.

### Out of Scope

- Zod validation, DTO mapping, or any domain-error knowledge inside the shared module.
- Any status-code branching inside the shared module (401/403/404 stay per-call-site).
- Header synthesis, retries, timeouts, logging, interceptors, base-URL handling, or a request-builder API.
- Changing either adapter's public contract, thrown error types, or the D6 "plain `Error`" decision in timer-configuration.

## Capabilities

### New Capabilities

- None. Internal refactor; no new user- or system-observable capability.

### Modified Capabilities

- None. `timer-configuration-persistence` and `session-authentication` requirements are unchanged by construction — behavior parity is the success criterion. `infraestructure-structure` already covers `__tests__/` co-location for any infra module, so `src/infraestructure/http/` needs no new requirement.

## Approach

Exploration Approach 1 (two-phase client). Splitting fetch from parse preserves the status-check-before-parse ordering both adapters already rely on and both test suites already assert, so no call-site logic is reordered — the manual `try/catch` around `fetch` and around `response.json()` are the only things replaced. It also avoids inventing a callback/status-map API (Approach 2), which would drag per-adapter error knowledge back into the shared module — the same objection Issue #28 already raised against putting Zod there. Approach 3 (lift timer-configuration's helpers) is the fallback if design decides `ensureOk`'s shape is worth generalizing, but it requires the same Zod split either way.

The neutral error's exact shape is a design decision: both adapters must be able to remap it cheaply without losing their existing contracts (`_tag` domain errors in auth, plain `Error` in timer-configuration).

## Affected Areas

| Area                                                                             | Impact   | Description                                                      |
| -------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `src/infraestructure/http/`                                                      | New      | `httpClient` + `parseJsonBody` + `__tests__/`                    |
| `src/infraestructure/auth/backend-auth.adapter.ts`                               | Modified | Inline fetch/parse try/catch replaced by the shared calls        |
| `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` | Modified | 3 local helpers removed; Zod `safeParse` moves inline per method |
| Both adapters' `__tests__/`                                                      | Modified | Same assertions; mocks adjusted only if the contract requires it |

## Risks

| Risk                                                                                                 | Likelihood | Mitigation                                                                                                           |
| ---------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Splitting timer-configuration's fused `parseBody` silently changes which failures map to which error | Med        | Its existing parametrized D6 tests distinguish parse-failure from validation-failure; both must stay green unchanged |
| `httpClient` needs a `Response` member the test mocks don't provide (`headers`, `statusText`)        | Med        | Constrain the module to `ok`/`status`/`json()` only, matching both existing mocks                                    |
| Incidental logging in the shared module leaks the auth ID token or raw body                          | Low        | No logging at all in `src/infraestructure/http/`; auth's console-spy test guards it                                  |
| Abstraction validated against only 2 call sites                                                      | Low        | Keep the surface at two mechanical functions; no speculative generalization                                          |

## Rollback Plan

Revert the change commits. Both adapters return to self-contained pipelines with no external dependency beyond `fetch`; the new folder deletes cleanly. No domain, port, schema, or public-contract change to undo.

## Dependencies

- None. Both adapters and their suites exist and pass today.

## Success Criteria

- [ ] `src/infraestructure/http/` exports only `httpClient` and `parseJsonBody`; contains no Zod, no status branching, no logging.
- [ ] Both adapter test suites pass with their behavioral assertions unchanged (error types, `_tag`s, and exact `fetch` call args preserved).
- [ ] `requestJson`/`ensureOk`/`parseBody` no longer exist in the timer-configuration adapter.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` all pass.
- [ ] Net line count across the two adapters decreases.

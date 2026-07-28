# Verification Report: Shared httpClient for Backend Adapters (Issue #28)

**Change**: shared-http-client
**Mode**: hybrid (Engram + openspec file snapshot), Strict TDD
**Verified against**: spec (rev-1 text, unrevised), design rev-2 (#124), tasks rev-2 (#125, 14/14), apply-progress rev-2 (#126)
**Verdict**: PASS WITH WARNINGS

## Completeness (tasks rev-2)

All 14 tasks in `openspec/changes/shared-http-client/tasks.md` are checked `[x]`, across 4 phases (httpClient rewrite, auth adapter, timer-config adapter, verification). No unchecked tasks found.

## Command Evidence (run independently, not trusted from apply report)

| Command            | Result                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`     | 0 errors, 17 pre-existing unrelated warnings (unused `_id`/`_token`/`_dtoId` vars in test files predating this change) |
| `npx tsc --noEmit` | Clean, no output                                                                                                       |
| `npm run test`     | 288/288 tests passing, 47 test files, 3.80s                                                                            |

## Implementation Shape Check

- `src/infraestructure/http/httpClient.ts` exports exactly `HttpClient` (type) and `createHttpClient()` — verified by direct read. `createHttpClient()` returns `{ get, post, put, delete }`, each a `request(method)` closure over `fetch`. No Zod import, no status-code conditional, no logging inside the module.
- `rg -n "parseJsonBody|isHttpClientError|HttpClientErrorName|requestJson\b" src/` → **no matches**. No rev-1 API remnants anywhere in `src/`.
- `backend-auth.adapter.ts` consumes `createHttpClient()` correctly: `http.post(url, { headers, body })`, own `try/catch` around `response.json()` restoring `backendUnavailable(cause, "Auth backend response is not valid JSON")`.
- `backend-timer-configuration.adapter.ts` consumes it correctly across all 5 call sites (`create`→post, `list`→get, `getById`→get, `update`→put, `delete`→delete); `parseDto` regained its own try/catch restoring the adapter-scoped message; `ensureOk` untouched; no catch wraps the network-failure path (D2, intentional).
- JSDoc on `createBackendTimerConfigurationAdapter` was flagged stale by the prior 4-lens review and has **already been fixed** — verified it now reads accurately: network failures propagate httpClient's generic `HttpRequestFailed` message uncaught, while parse/validation/404 failures keep adapter-specific messages/errors. No re-flag needed.
- `git diff --stat main -- src/infraestructure/auth/__tests__/ src/infraestructure/timer-configuration/__tests__/` → empty. Neither adapter's test suite was touched, which is the behavior-parity proof both the design and tasks require.

## Spec Compliance Matrix

| Spec scenario                                                             | Covering test                                                                                                                                                                     | Runtime result             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Auth adapter preserves its error contract                                 | `backend-auth.adapter.test.ts` (9 tests, `_tag`s: `InvalidCredentials`, `BackendUnavailable`)                                                                                     | PASS, zero test-file edits |
| Timer-configuration adapter preserves its error contract                  | `backend-timer-configuration.adapter.test.ts` (27 tests, incl. 404→`TimerConfigurationNotFound`, JSON-parse-failure→generic `Error` no `_tag`)                                    | PASS, zero test-file edits |
| Shared module has no domain or status-code knowledge / surface is minimal | `httpClient.test.ts` (10 tests: verb dispatch ×4, method override, Response identity, non-2xx resolves, reject→`HttpRequestFailed`+cause+no `_tag`, no URL/body leak, never logs) | PASS                       |

All three ADDED requirement scenarios have a passing covering test at runtime — confirmed by independently re-running `npm run test`, not by trusting the apply report.

## Design Coherence

Design rev-2 (#124) is followed verbatim: D1 (verb-method factory, not `httpClient(url, init)`), D2 (timer-config's network failure stays generic/unwrapped; auth remaps via its own catch), D3 (JSON parsing moved back into each adapter, `parseJsonBody` deleted), D4 (module's own error message carries no URL/init/body), D5 (`isHttpClientError`/`HttpClientErrorName` deleted, zero remaining callers). No deviations found between design and code.

## Issues

### WARNING — spec artifact not updated for the rev-2 pivot

`openspec/changes/shared-http-client/specs/shared-http-client/spec.md` (= Engram `sdd/shared-http-client/spec`, id #123) still contains the **rev-1** requirement text: _"The new `src/infraestructure/http/` module MUST expose only `httpClient(url, init)` and `parseJsonBody(response)`"_ and its scenario _"THEN only `httpClient` and `parseJsonBody` are exported"_. Both function names no longer exist anywhere in the codebase — the on-disk implementation is `createHttpClient()` returning `{ get, post, put, delete }`, per design rev-2 and tasks rev-2 (both of which are explicitly marked "Revision 2" and documented the pivot). The _intent_ of the requirement (minimal surface, no domain/status-code knowledge, no logging) is fully satisfied by the actual code — verified above — but the literal exported-symbol names in the spec are now factually wrong. This is a spec-hygiene gap, not a behavioral defect: nothing in the shipped code violates the requirement's purpose, but a reader trusting the spec's literal text would be misled about the module's actual API shape.

Recommended fix before archive: amend the spec's "Shared module has no domain or status-code knowledge" requirement and its scenario to name `createHttpClient()` / `{ get, post, put, delete }` instead of `httpClient(url, init)` / `parseJsonBody(response)`, or add a revision note pointing to design rev-2 as the pivot record.

No CRITICAL issues found. No SUGGESTION-level issues found beyond the above.

## Final Verdict

**PASS WITH WARNINGS** — 0 CRITICAL, 1 WARNING (spec text stale re: rev-2 pivot), 0 SUGGESTION. Implementation, tests, and design are internally consistent and all green; the spec artifact's literal wording was never revised to match the approved rev-2 design pivot and should be corrected before or during archive.

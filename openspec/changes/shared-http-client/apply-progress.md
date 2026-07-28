# Apply Progress: Shared httpClient for Backend Adapters (Issue #28)

> **Revision 2.** Supersedes the 11-task rev-1 apply-progress. Reworks the
> applied `httpClient(url, init)` + `parseJsonBody(response)` code on disk
> into the `createHttpClient()` verb-method factory per design rev-2 (#124)
> and tasks rev-2 (#125).

**Status**: 14/14 tasks complete. Ready for verify.
**Mode**: Strict TDD

## Completed Tasks

- [x] 1.1 RED — rewrote `httpClient.test.ts` to target `createHttpClient()`; confirmed failing (`createHttpClient is not a function`, 10/10 tests failing)
- [x] 1.2 GREEN — rewrote `httpClient.ts`: `HttpClient` type + `createHttpClient()` returning `{ get, post, put, delete }` via private `request(method)`; deleted `parseJsonBody`, `isHttpClientError`, `HttpClientErrorName`, `httpError`
- [x] 1.3 `npm run test` — `httpClient.test.ts` green (10/10)
- [x] 2.1 `backend-auth.adapter.ts`: import `createHttpClient`; `const http = createHttpClient();` inside factory body; `exchange` calls `http.post(url, { headers, body })` (method field dropped, network-failure catch → `backendUnavailable` unchanged)
- [x] 2.2 Restored adapter-owned JSON parse: `rawBody = await response.json();` inside the existing `try/catch` → `backendUnavailable(cause, "Auth backend response is not valid JSON")`
- [x] 2.3 `npm run test` — auth adapter suite green (9/9), zero test-file edits
- [x] 3.1 `backend-timer-configuration.adapter.ts`: import `createHttpClient`; `const http = createHttpClient();` inside factory body; all 5 call sites (`create`→post, `list`→get, `getById`→get, `update`→put, `delete`→delete) switched to `http.<verb>`; `ensureOk` untouched; no catch added around any call (D2 — network failure stays generic, unwrapped)
- [x] 3.2 Restored `parseDto`'s own JSON-parse try/catch: `new Error("Timer configuration backend response is not valid JSON", { cause })` on parse failure; `schema.safeParse` + validation-failure throw unchanged
- [x] 3.3 `npm run test` — timer-config adapter suite green (27/27), zero test-file edits
- [x] 4.1 Full gate: `npm run lint` (0 errors, 17 pre-existing unrelated warnings), `npx tsc --noEmit` (clean), `npm run test` (288/288)
- [x] 4.2 Confirmed `httpClient.ts` exports only `HttpClient` (type) and `createHttpClient` — no `parseJsonBody`, no `isHttpClientError`, no `HttpClientErrorName`, no Zod, no status-code conditional
- [x] 4.3 `git diff -- src/infraestructure/auth/__tests__/ src/infraestructure/timer-configuration/__tests__/` — empty (behavior-parity proof)
- [x] 4.4 Manually confirmed: timer-config JSON-parse failure throws `new Error("Timer configuration backend response is not valid JSON", { cause })`; timer-config network failure still surfaces the shared module's generic `"HTTP request failed"` (D2, unchanged, not re-wrapped)

## Files Changed

| File                                                                             | Action    | What Was Done                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/http/httpClient.ts`                                         | Rewritten | `HttpClient` type + `createHttpClient()` factory (`get`/`post`/`put`/`delete`); deleted `parseJsonBody`, `isHttpClientError`, `HttpClientErrorName`                           |
| `src/infraestructure/http/__tests__/httpClient.test.ts`                          | Rewritten | 10 unit tests targeting the factory shape (verb dispatch, init passthrough, method override, identity, non-2xx-resolves, reject→`HttpRequestFailed`, no-URL-leak, no-console) |
| `src/infraestructure/auth/backend-auth.adapter.ts`                               | Modified  | `httpClient`/`parseJsonBody` → `createHttpClient()`'s `http.post` + own `response.json()` try/catch                                                                           |
| `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` | Modified  | 5 call sites → `http.get/post/put/delete`; `parseDto` regained its own try/catch restoring the adapter-scoped JSON-parse message                                              |

## TDD Cycle Evidence

| Task    | Test File                                                                     | Layer | Safety Net      | RED                       | GREEN                               | REFACTOR |
| ------- | ----------------------------------------------------------------------------- | ----- | --------------- | ------------------------- | ----------------------------------- | -------- |
| 1.1-1.3 | `httpClient.test.ts`                                                          | Unit  | N/A (rewritten) | Confirmed failing (10/10) | Passed 10/10                        | Clean    |
| 2.1-2.3 | `backend-auth.adapter.test.ts` (unedited, approval-test style)                | Unit  | 9/9 baseline    | N/A (refactor)            | Passed 9/9, zero edits              | Clean    |
| 3.1-3.3 | `backend-timer-configuration.adapter.test.ts` (unedited, approval-test style) | Unit  | 27/27 baseline  | N/A (refactor)            | Passed 27/27, zero edits            | Clean    |
| 4.1-4.4 | Full suite                                                                    | N/A   | N/A             | N/A                       | lint 0 errors / tsc clean / 288/288 | N/A      |

## Deviations from Design

None — implementation matches design rev-2 verbatim (D1-D5). `createHttpClient()`'s private `request(method)` closure and error-brand shape match the design's Interfaces/Contracts code block exactly.

## Issues Found

None.

## Remaining Tasks

None — all 14 tasks complete.

## Workload / PR Boundary

- Mode: single PR
- Current work unit: Unit 1 — full revision (httpClient factory rewrite + both adapters)
- Boundary: entire revision delivered in one batch; `git status` confirms exactly the planned footprint (2 adapters modified, `httpClient.ts` + its test rewritten, no new files)
- Estimated review budget impact: ~90 changed lines (within design's forecast) — well under the 400-line budget (Low risk)
- Note: the diff touches `src/infraestructure/auth/backend-auth.adapter.ts`, matching the `**/auth/**` hot-path glob — PR-time review should run the full 4R fan-out per the tasks' Review Workload Forecast, not the single-lens pre-commit default

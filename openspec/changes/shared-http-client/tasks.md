# Tasks: Shared httpClient for Backend Adapters (Issue #28)

> **Revision 2.** Supersedes the 11-task list that implemented the applied
> `httpClient(url, init)` + `parseJsonBody(response)` two-phase design. Reworks
> the code already on disk into the `createHttpClient()` verb-method factory
> per design rev-2 (#124). Smaller and more surgical than the original list:
> the module and both call sites already exist, this only reshapes them.

Strict TDD: failing test first (RED), then minimal implementation (GREEN).
`should` titles, AAA with blank lines, mocks only at port boundaries
(`vi.stubGlobal("fetch", ...)`). Follows design's file list/interfaces
(D1-D5) verbatim. Open question from design is resolved: timer-config's
network-failure message stays generic (D2 unchanged); only its JSON-parse
message is restored as adapter-scoped (D3).

## Review Workload Forecast

| Field                   | Value                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~90 (httpClient.ts rewrite ~25, httpClient.test.ts rewrite ~70 replacing ~90, auth adapter diff ~8, timer-config adapter diff ~20) |
| 400-line budget risk    | Low                                                                                                                                |
| Chained PRs recommended | No                                                                                                                                 |
| Suggested split         | Single PR                                                                                                                          |
| Delivery strategy       | single-pr                                                                                                                          |
| Chain strategy          | n/a                                                                                                                                |

Decision needed before apply: No — 4 files touched (1 module rewrite + its
test, 2 adapters reshaped in place), zero new files, well under the 400-line
budget.

Note for the review step: the diff touches
`src/infraestructure/auth/backend-auth.adapter.ts`, which matches the
`**/auth/**` hot-path glob in the PR review-lens table. Even though this diff
is small, run the full 4R fan-out (`review-risk`, `review-resilience`,
`review-readability`, `review-reliability`) rather than the single
`review-readability` default, per the hot-path rule.

### Suggested Work Units

| Unit | Goal                                                      | Likely PR | Notes                                                                                                   |
| ---- | --------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| 1    | Full revision: httpClient factory rewrite + both adapters | PR 1      | Single PR; base `main`. Reshapes 3 existing files, no new files, comfortably under the 400-line budget. |

Note: Phase 2 (auth adapter) and Phase 3 (timer-config adapter) touch
disjoint files with no shared state — once Phase 1 lands they are
parallelizable across engineers. Sequential TDD order below is the
solo-engineer default, not a hard dependency.

## Phase 1: Rewrite `src/infraestructure/http/httpClient.ts` (Spec: Shared module has no domain or status-code knowledge)

- [x] 1.1 RED — rewrite `src/infraestructure/http/__tests__/httpClient.test.ts` (node env, `vi.stubGlobal("fetch", vi.fn())`) to target `createHttpClient()`. Delete the `parseJsonBody` and `isHttpClientError` `describe` blocks entirely (dead API, D5). New assertions per verb (`get`/`post`/`put`/`delete`): calls global `fetch` with `(url, { ...init, method: "<VERB>" })` — `init`'s `headers`/`body` pass through untouched; a caller-supplied `init.method` is overridden by the verb method, not honored; resolves the same `Response` object identity `fetch` resolved; a non-2xx response resolves instead of throwing. Cross-verb (assert once, e.g. against `get`): `fetch` rejecting → thrown `Error` has `name === "HttpRequestFailed"`, `cause` set to the original rejection, `_tag` undefined; error `message` contains no URL and no `init`/body content (D4); never calls `console.*` (spy).
- [x] 1.2 GREEN — rewrite `src/infraestructure/http/httpClient.ts`: export `HttpClient` type (`{ get, post, put, delete }`, each `(url: string, init?: RequestInit) => Promise<Response>`) and `createHttpClient(): HttpClient`. Private `request(method: string)` returns the async handler: `try { return await fetch(url, { ...init, method }); } catch (cause) { throw Object.assign(new Error("HTTP request failed", { cause }), { name: "HttpRequestFailed" }); }`. `createHttpClient()` returns `{ get: request("GET"), post: request("POST"), put: request("PUT"), delete: request("DELETE") }`. Delete `parseJsonBody`, `isHttpClientError`, `HttpClientErrorName`, and the old `httpError`/name-union helper entirely. Reference `fetch` as a global at call time (inside `request`'s returned closure), never captured at module load, so `vi.stubGlobal` still intercepts. No Zod, no status-code branching, no logging (spec: Shared module surface is minimal).
- [x] 1.3 Run `npm run test` — confirm the rewritten `httpClient.test.ts` is green.

## Phase 2: Refactor `backend-auth.adapter.ts` (Spec: Auth adapter preserves its error contract)

- [x] 2.1 In `src/infraestructure/auth/backend-auth.adapter.ts`: swap the import from `{ httpClient, parseJsonBody }` to `{ createHttpClient }`; add `const http = createHttpClient();` inside `createBackendAuthAdapter`'s body (constructed once per adapter instance, not at module scope). Replace the `httpClient(url, { method: "POST", headers, body })` call in `exchange` with `http.post(url, { headers, body })` (drop the now-redundant `method` field — the verb method supplies it). Leave the network-failure `catch` (→ `backendUnavailable(cause, "Auth backend request failed")`) and the 401/403/`!ok` status branches unchanged (D2).
- [x] 2.2 Restore the adapter-owned JSON-parse try/catch: replace `rawBody = await parseJsonBody(response);` with `rawBody = await response.json();` inside the existing `try { … } catch (cause) { throw backendUnavailable(cause, "Auth backend response is not valid JSON"); }` block — the wrapper text is unchanged, only the parse call moves back into the adapter (D3).
- [x] 2.3 Run `npm run test` — confirm `src/infraestructure/auth/__tests__/backend-auth.adapter.test.ts` passes green with **zero edits** (global-`fetch`-stub proof of behavior parity; the suite asserts `fetch` call args and thrown `_tag` errors, not the shared module's internals).

## Phase 3: Refactor `backend-timer-configuration.adapter.ts` (Spec: Timer-configuration adapter preserves its error contract)

- [x] 3.1 In `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts`: swap the import from `{ httpClient, parseJsonBody }` to `{ createHttpClient }`; add `const http = createHttpClient();` inside `createBackendTimerConfigurationAdapter`'s body. Replace all 5 call sites' `httpClient(url, { method: "<VERB>", ...rest })` with `http.<verb>(url, { ...rest })` (drop the now-redundant `method` field): `create` → `http.post`, `list` → `http.get`, `getById` → `http.get`, `update` → `http.put`, `delete` → `http.delete`. `ensureOk` is untouched. No `catch` is added around any of the 5 calls — the neutral `HttpRequestFailed` error already satisfies D6 (plain `Error`, no `_tag`), so the network-failure message stays generic per D2 (resolved open question — timer-config does NOT re-wrap network failures).
- [x] 3.2 Restore `parseDto`'s own JSON-parse try/catch (D3): `let body: unknown; try { body = await response.json(); } catch (cause) { throw new Error("Timer configuration backend response is not valid JSON", { cause }); }` — then `schema.safeParse(body)` and the existing validation-failure `Error` throw stay as-is.
- [x] 3.3 Run `npm run test` — confirm `src/infraestructure/timer-configuration/__tests__/backend-timer-configuration.adapter.test.ts` passes green with **zero edits**, including the 404 → `timerConfigurationNotFound(id)` case (D5/D6) and the JSON-parse-failure case (the suite asserts `toBeInstanceOf(Error)` + `_tag` undefined, not the message string, so the restored message needs no test change).

## Phase 4: Verification (Spec: Behavior parity across the httpClient extraction)

- [x] 4.1 Run full gate: `npm run lint`, `npx tsc --noEmit`, `npm run test` — all green.
- [x] 4.2 Confirm `src/infraestructure/http/httpClient.ts` exports only `HttpClient` (type) and `createHttpClient` — no `parseJsonBody`, no `isHttpClientError`, no `HttpClientErrorName`, no Zod import, no status-code conditional (spec: Shared module surface is minimal; design D5).
- [x] 4.3 Confirm `git diff -- src/infraestructure/auth/__tests__/ src/infraestructure/timer-configuration/__tests__/` is empty (no edits needed to either adapter's test suite for this revision — behavior-parity proof).
- [x] 4.4 Manually confirm the two restored/kept messages: timer-config JSON-parse failure throws `new Error("Timer configuration backend response is not valid JSON", { cause })` (adapter-scoped, restored); timer-config network failure still surfaces the shared module's generic `"HTTP request failed"` (D2, unchanged, resolved open question — not re-wrapped).

## Non-Goals (carried from design, do not implement)

Headers/base-URL/retries/timeouts abstraction, status-code branching inside
the shared module, logging, a new `_kind`/error-brand vocabulary beyond the
native `name` field, restoring timer-config's pre-refactor
`"Timer configuration backend request failed"` network-failure string
(explicitly declined — see design's Open Questions, now resolved).

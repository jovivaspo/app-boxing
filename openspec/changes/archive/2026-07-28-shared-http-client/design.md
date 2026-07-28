# Design: Shared httpClient for Backend Adapters (Issue #28)

> **Revision 2.** Supersedes the two-phase `httpClient(url, init)` + `parseJsonBody(response)`
> design that was already applied. Driven by a post-apply readability review:
> `isHttpClientError` shipped with zero callers, and timer-configuration's refactor
> silently dropped its adapter-specific error messages. The applied code on disk must be
> reworked to match this document.

## Technical Approach

`src/infraestructure/http/httpClient.ts` exports **one factory**, `createHttpClient()`,
returning `{ get, post, put, delete }`. Each verb method calls `fetch` with the method
pre-set, maps **only** a network failure to a neutral branded `Error`, and returns the raw
`Response`. Nothing else: no JSON parsing, no status branching, no Zod, no logging, no
type guard, no headers/base-URL/retries/timeouts. Functional factory, no classes — project
convention. File stays flat + sibling `__tests__/`, matching `storage/localStorage.ts`.

## Architecture Decisions

### D1 (revised) — Verb-method factory, not a single `httpClient(url, init)` function

| Option                                              | Tradeoff                                                                           | Decision   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| `httpClient(url, init)` (rev-1)                     | Every call site restates `method:` inside `init`; verb is buried in an options bag | Superseded |
| `class HttpClient`                                  | Violates the project-wide no-classes rule                                          | Rejected   |
| `createHttpClient()` → `{ get, post, put, delete }` | One extra construction line per adapter                                            | **Chosen** |

Rationale: the verb is the request's primary axis, so it belongs in the call, not in a bag.
`{ ...init, method }` means the verb always wins and `init` keeps carrying `headers`/`body`
unchanged — so the global `fetch` still receives an identical `(url, { method, headers, body })`
object. Error brand keeps rev-1's shape (`Object.assign(new Error(msg, { cause }), { name })`),
which already works and keeps the result a plain `Error` with **no `_tag`** (D6).

### D2 (unchanged) — Timer-configuration propagates the neutral network error; auth remaps it

Still true, still for the same reason: the neutral error is `instanceof Error` with no `_tag`,
which already satisfies D6, so timer-config needs no `catch` for the network path. Auth has one
call site and must reach `backendUnavailable()`, so it keeps its one-line `catch`.

### D3 (revised) — JSON parsing returns to the adapters; `parseJsonBody` is deleted

`parseJsonBody` bought one `try/catch` per adapter and cost both adapters their own error
message: it can only produce a generic `"HTTP response is not valid JSON"`. Each adapter now
wraps `await response.json()` in its own `try/catch` again — the same code that existed before
this refactor. This is what **restores message specificity**: timer-config re-wraps as
`new Error("Timer configuration backend response is not valid JSON", { cause })` (plain `Error`,
no `_tag` → D6 intact), auth re-wraps as `backendUnavailable(cause, "Auth backend response is not
valid JSON")` as it always has. Neither D2 nor D6 changes — only _where_ the parse `try/catch`
lives.

### D4 (kept, narrowed) — The module's error message carries no URL, no `init`, no body

Static string only; the original failure travels in `cause`. Now binds the **network path only**,
since it is the module's only error. Parse-failure messages are adapter-owned and already static.

### D5 (new) — `isHttpClientError` is deleted

Zero production callers: auth catches unconditionally, timer-config does not catch at all. Dead
code that also forced the `HttpClientErrorName` union to exist. Both go. The `name` brand stays on
the error for stack-trace legibility, but nothing narrows on it.

## Data Flow

    adapter method
      │  http.post(url, { headers, body })  ──▶  fetch(url, { ...init, method: "POST" })
      ▼                                            (throws ONLY on network failure)
    Response (raw — non-2xx included, NOT thrown)
      │  adapter's own status branch: 401/403 → invalidCredentials()
      │                               404 + id → timerConfigurationNotFound(id)
      │                               !ok      → adapter's own error
      ▼
    adapter's OWN try { await response.json() } catch → adapter's OWN message + cause
      ▼
    adapter's schema.safeParse ──▶ mapper ──▶ domain model

## File Changes

| File                                                                             | Action             | Description                                                                                                                             |
| -------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/http/httpClient.ts`                                         | Rewrite            | `createHttpClient` + `HttpClient` type only; delete `parseJsonBody`, `isHttpClientError`, `HttpClientErrorName`                         |
| `src/infraestructure/http/__tests__/httpClient.test.ts`                          | Rewrite            | Rev-1's 13 tests target a deleted API; see Testing Strategy                                                                             |
| `src/infraestructure/auth/backend-auth.adapter.ts`                               | Modify             | `httpClient(url, {method:"POST",…})` → `http.post(url, {…})`; `parseJsonBody(response)` → `response.json()` inside the existing `catch` |
| `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` | Modify             | 5 call sites → `http.get/post/put/delete`; `parseDto` regains its `try/catch` with the adapter-scoped message                           |
| Both adapters' `__tests__/`                                                      | Expected no change | See Testing Strategy — edits allowed, but mechanics only                                                                                |

Filename `httpClient.ts` is kept — no rename churn for a module that still is the http client.

## Interfaces / Contracts

```typescript
// src/infraestructure/http/httpClient.ts
export type HttpClient = {
  get(url: string, init?: RequestInit): Promise<Response>;
  post(url: string, init?: RequestInit): Promise<Response>;
  put(url: string, init?: RequestInit): Promise<Response>;
  delete(url: string, init?: RequestInit): Promise<Response>;
};

/** Non-2xx resolves normally. @throws {Error} name `HttpRequestFailed` — network failure only. */
export function createHttpClient(): HttpClient;

// private
function request(method: string) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    try {
      return await fetch(url, { ...init, method });
    } catch (cause) {
      throw Object.assign(new Error("HTTP request failed", { cause }), {
        name: "HttpRequestFailed",
      });
    }
  };
}
```

`fetch` is resolved as a global at call time (never captured at module load) so
`vi.stubGlobal("fetch", …)` still intercepts. The module touches no `Response` member at all
now — mocks only need whatever the _adapters_ read (`ok`, `status`, `json`).

Adapters construct once inside their factory body: `const http = createHttpClient();` — not at
module scope, so nothing runs at import time.

### Timer-config `parseDto` (the D3 restoration)

```typescript
async function parseDto<T>(
  response: Response,
  schema: z.ZodType<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new Error("Timer configuration backend response is not valid JSON", {
      cause,
    });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Timer configuration backend response failed validation");
  }
  return parsed.data;
}
```

## Testing Strategy

| Layer                               | What to Test                                                                                                                                                                                                                                                                                                                                                                                           | Approach                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Unit (`createHttpClient`)           | each verb calls `fetch` with its own method; `init` (`headers`/`body`) passes through untouched; a caller-supplied `init.method` is overridden by the verb; resolves the same `Response` object identity; **non-2xx resolves, does not throw**; `fetch` rejects → `name === "HttpRequestFailed"`, `cause` preserved, `_tag` undefined; message contains no URL/init/body (D4); never logs              | `vi.stubGlobal("fetch", vi.fn())`, node env |
| Unit (timer-config `parseDto` path) | non-JSON body → plain `Error`, no `_tag`, adapter-scoped message, `cause` preserved                                                                                                                                                                                                                                                                                                                    | existing D6 table gains a message assertion |
| Adapter suites                      | **Expected zero edits, but no longer guaranteed.** Both suites mock the _global_ `fetch`, not `httpClient`, and assert `toHaveBeenCalledWith(url, { method, headers, body })` — deep equality is key-order-independent, and `{ ...init, method }` reproduces that exact object. Any edit forced by the new call shape must change **mechanics only** (what is mocked/called), never assertion content. | existing suites re-run                      |

TDD order: rewrite `httpClient.test.ts` first (red), implement `createHttpClient`, then refactor
each adapter and confirm its suite stays green.

## Migration / Rollout

No migration, flag, or schema change. Reworks already-merged refactor code in place; rollback =
revert. Deleting `parseJsonBody`/`isHttpClientError` is safe — the two adapters are the only
importers.

## Open Questions

- [ ] **Residual, non-blocking**: timer-config's _network_-failure message stays neutral
      (`"HTTP request failed"`) because D2 says it must not catch that path. Its pre-refactor
      `"Timer configuration backend request failed"` string is therefore **not** restored;
      only the JSON-parse message is. Restoring it would mean reintroducing a `requestJson`-style
      wrapper across 5 call sites — the exact thing this refactor deleted. Say so if you want it back.

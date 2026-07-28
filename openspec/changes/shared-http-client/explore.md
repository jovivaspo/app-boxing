# Exploration: shared-http-client (Issue #28)

## Current State

- No `src/infraestructure/http/` exists yet — greenfield, confirmed via glob.
- `src/infraestructure/auth/backend-auth.adapter.ts` (68 lines) — single inline function, no extracted helpers. `fetch()` try/catch → `backendUnavailable`; `401/403` → `invalidCredentials()`; other non-ok → `backendUnavailable`; `response.json()` try/catch → `backendUnavailable`; `safeParse` failure → `backendUnavailable`. No `Authorization` header; `Content-Type` on the one POST. Doc comment: must never log the ID token or raw body.
- `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` (137 lines) — already has local helpers `requestJson`/`ensureOk`/`parseBody` matching the exact pipeline shape the issue describes, but `parseBody` currently fuses JSON-parse and `safeParse` together, throwing a generic `Error` (no domain error, per its own D6 comment) on any failure. `ensureOk` takes an optional per-call `notFoundId` → 404 maps to `timerConfigurationNotFound(id)`. `Authorization: Bearer {token}` on every call; `Content-Type` only on POST/PUT.

## Affected Areas

- `src/infraestructure/auth/backend-auth.adapter.ts` — refactor target, no local helpers to remove, just inline logic to replace.
- `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` — refactor target; its `parseBody` must be split (JSON-parse moves to shared client, `safeParse` stays local).
- `src/infraestructure/auth/__tests__/backend-auth.adapter.test.ts` (9 cases) and `src/infraestructure/timer-configuration/__tests__/backend-timer-configuration.adapter.test.ts` (18+ cases incl. `it.each`) — both mock only `{ ok, status, json }` on `Response`; behavior in every case must survive the refactor.

## Approaches

1. **Two-phase client** — `httpClient(url, init)` maps only network failures and returns the raw `Response`; a separate `parseJsonBody(response)` maps JSON-parse failures. Callers keep their existing status-check-before-parse ordering unchanged.
   - Pros: matches current call-site ordering exactly, no per-call status callback needed.
   - Cons: two functions per call site instead of one.
   - Effort: Low.
2. **Single fused client** taking an optional status-handling callback.
   - Pros: closer to the issue's literal wording, one call site.
   - Cons: risks pulling per-adapter error-mapping knowledge back into the client — the same objection the issue raised against centralizing Zod validation.
   - Effort: Medium.
3. **Lift timer-configuration's `requestJson`/`ensureOk`/`parseBody` near-verbatim**, generalizing `notFoundId`, splitting the Zod step back out.
   - Pros: reuses an already-proven shape.
   - Cons: `notFoundId` naming is timer-configuration-specific; needs generalizing before future adapters fit cleanly.
   - Effort: Medium.

## Recommendation

Approach 1 — least invention, preserves the status-check-before-parse ordering both adapters (and their tests) already rely on, avoids inventing a status-callback API.

## Risks / Open Questions (for design phase)

- Splitting timer-configuration's fused `parseBody` is a real code change, not a lift — its JSON-parse-failure vs. validation-failure test cases need re-verification post-split.
- Neither test suite mocks a real `Response` (only `ok`/`status`/`json`) — if the client design needs any other `Response` member, mocks will need updating too.
- Only 2 real call sites exist today; the issue's "generalizes to future adapters" claim can't be empirically validated here.
- Auth's non-logging requirement isn't enforced beyond one test's console spy — the shared client must be written not to log `init.body` or raw responses.

## Ready for Proposal

Yes — no open questions blocking `sdd-propose`.

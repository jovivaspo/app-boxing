# Design: Refactor Login to Hexagonal + TDD (`session-authentication`)

## Context

Formalizes the SHIPPED login flow (GSI client button → ID token → Server Action →
external backend → `jwt`/`user` cookies) behind Clean/Hexagonal ports & adapters,
backed by TDD, while preserving login/logout UX. Resolves the `explore.md`
violations: god Server Action, sensitive logging (`actions.ts:9,17`), hardcoded
private-IP fallback (`actions.ts:6`), unverified plain-JSON `user` cookie, and the
untestable window-global GSI hook. Follows the project's flat layer layout
(`src/domain`, `src/application`, `src/infraestructure`, `src/ui`) and the AGENTS.md
`infraestructure` spelling — NOT the skill's `features/` folder. Does NOT adopt
`oauth-login-flow`'s PKCE contract (superseded; disposition noted only).

## Architecture Decisions

| # | Decision | Alternatives rejected | Rationale |
|---|----------|-----------------------|-----------|
| D1 | Domain `User` evolves to backend truth: `{id,name,email,role:string,pictureUrl:string\|null,createdAt:string}`. Drop `isActive` and the `Role` union. | Keep union + synthesize `isActive=true`, narrow `role` with `"user"` fallback, carry `createdAt` outside `User`. | `isActive` is never provided/used; the `admin\|user` union is wrong for a boxing app (coach/boxer/etc.) — narrowing would silently drop backend roles. This IS "what the mapper needs" to produce a valid object supporting current profile rendering. Minimal + behavior-preserving. |
| D2 | Sign the `user` cookie with HMAC-SHA256 (`SESSION_SECRET`); verify before trust. | JWE/encryption; store profile in `jwt` only; sign both cookies. | Integrity (not secrecy) is the requirement; profile is non-secret. HMAC is stdlib (`node:crypto`), zero deps. `jwt` stays opaque/httpOnly as-is. |
| D3 | Force re-login on invalid/unsigned cookie: `get()` returns `null`. No dual-format read path. | Legacy plain-JSON fallback / migration shim. | Per scope decision #4. Simpler, fail-closed, no drift risk. |
| D4 | `SessionPort` = `create/get/clear`; verification folded into fail-closed `get(): Session\|null`. | Separate `verify()` per proposal sketch. | A standalone `verify` is redundant and opens a TOCTOU gap; `create` is required (use case must persist the session — the proposal's sketch omitted it). |
| D5 | GSI isolated behind `GoogleIdentityPort`; per-file `@vitest-environment jsdom` pragma for its non-visual tests. | Global jsdom env; keep window-globals in the hook. | Keeps pure domain/application tests on `node`; makes the adapter fakeable and the hook DOM-light. |
| D6 | Composition root at each entry point (action/RSC/route) via a light `infraestructure/composition.ts` factory; DI into use cases. | Singletons; module-level instances; DI container. | RSC/actions are the sanctioned composition roots (skill). Factory centralizes env reads, avoids 4× wiring duplication. |
| D7 | Domain errors as tagged `Error` objects built via factory functions (`_tag` discriminant, e.g. `invalidCredentials()`); UI owns Spanish copy. **(Revised in PR1 — see below)** | ES6 classes (`class X extends Error`); Result objects; raw strings (current). | Preserves error *meaning* across layers; localization stays out of domain/infra. Classes rejected because this codebase is functional-only (no `class` anywhere in `src/`) — factory functions returning `Object.assign(new Error(...), {_tag})` keep `instanceof Error` true while staying idiomatic. **Consumers MUST discriminate on `_tag`, not `instanceof InvalidCredentials`/etc., since those are TS interfaces with no runtime representation.** |
| D8 | No hardcoded `BACKEND_URL` fallback — missing env fails closed. | Keep `?? "http://10.142…"`. | Security fix; a private LAN IP must never ship as default. |

## Interfaces / Contracts

### Domain — `src/domain/`
```ts
// user.model.ts  (evolved per D1; remove Role union + isActive)
export interface User { id: string; name: string; email: string;
  role: string; pictureUrl: string | null; createdAt: string; } // createdAt ISO-8601

// session.model.ts  (new)
export interface Session { token: string; user: User; } // token = opaque backend JWT

// errors/auth-errors.ts  (implemented in PR1 — tagged factory functions, D7 revised: no classes)
export interface InvalidCredentials extends Error { readonly _tag: "InvalidCredentials"; }
export function invalidCredentials(message?: string): InvalidCredentials;
export interface BackendUnavailable extends Error { readonly _tag: "BackendUnavailable"; }
export function backendUnavailable(cause?: unknown, message?: string): BackendUnavailable;
export interface SessionInvalid extends Error { readonly _tag: "SessionInvalid"; }
export function sessionInvalid(message?: string): SessionInvalid;
export type AuthError = InvalidCredentials | BackendUnavailable | SessionInvalid;
// Discriminate with `error._tag === "InvalidCredentials"`, NOT `instanceof InvalidCredentials`.
```

### Application ports — `src/application/ports/`
```ts
// auth.port.ts
export interface AuthPort {
  // @throws InvalidCredentials (401/403) | BackendUnavailable (network/5xx/malformed)
  exchange(idToken: string): Promise<Session>;
}
// session.port.ts
export interface SessionPort {
  create(session: Session): Promise<void>;       // sets signed jwt + user cookies
  get(): Promise<Session | null>;                // reads + HMAC-verifies; null if absent/tampered
  clear(): Promise<void>;                         // deletes jwt + user
}
// google-identity.port.ts  (driven; browser infra behind boundary)
export type GsiError = "missing-client-id" | "script-load-failed" | "no-credential";
export interface GoogleIdentityPort {
  load(cfg: { clientId: string; onCredential: (idToken: string) => void;
              onError: (e: GsiError) => void }): Promise<void>;
  renderButton(container: HTMLElement): void;
}
```

### Use cases — `src/application/use-cases/` (factory + injected ports; no `next/*`, no fetch)
```ts
signInWithGoogle({auth, session}) => (idToken) => Promise<Session>
  // deps: AuthPort + SessionPort. Empty idToken → InvalidCredentials.
  // exchange() then session.create(). Surfaces: InvalidCredentials, BackendUnavailable.
getCurrentSession({session}) => () => Promise<Session | null>
  // deps: SessionPort. Returns null on absent/invalid (force re-login). Surfaces: none.
signOut({session}) => () => Promise<void>
  // deps: SessionPort. Calls clear(). Surfaces: none.
```

### Infrastructure — `src/infraestructure/`
- **`auth/backend-auth.adapter.ts`** (implements `AuthPort`): reads `BACKEND_URL` (required, D8);
  `POST ${BACKEND_URL}/api/v1/auth/google` body `{ idToken }`, header `content-type: application/json`;
  NO logging of token/response. Mapping: `401|403 → InvalidCredentials`; `5xx / fetch reject → BackendUnavailable`;
  `2xx` → Zod-validate then map to `Session`; missing/malformed `token|user → BackendUnavailable`.
- **`auth/dto/backend-auth.dto.ts`**: Zod `backendAuthResponseSchema` = `{ token, user:{ id,name,email,role,pictureUrl?,createdAt } }` (validate at boundary only).
- **`auth/mappers/user.mapper.ts`** (D1/decision #6 reconciliation): `id,name,email` 1:1; `role` passthrough as free-form string; `pictureUrl ?? null`; `createdAt` kept as ISO string (UI parses to `Date`). `toSession(dto)` wraps `token + toUser`. DTO never leaks past this boundary.
- **`session/cookie-session.adapter.ts`** (implements `SessionPort`, uses `next/headers` `cookies()`):
  - `create`: `jwt` = token (httpOnly, secure in prod, sameSite lax, path `/`, maxAge 7d — unchanged); `user` = `sign(JSON.stringify(user))`, **httpOnly true** (hardened from `false`; nothing client-side reads it), same secure/sameSite/path/maxAge.
  - `get`: read both cookies → missing ⇒ `null`; HMAC-verify `user` (timing-safe) → mismatch/parse/legacy plain-JSON ⇒ `null` (D3); valid ⇒ `{ token: jwt, user }`.
  - `clear`: delete `jwt` + `user`.
- **`session/hmac.ts`**: `sign(payload,secret)` / `verify(value,secret)` via `crypto.createHmac('sha256')` + `timingSafeEqual`; value format `base64url(payload).base64url(mac)`. Missing `SESSION_SECRET` ⇒ config error on `create`, fail-closed `null` on `get`.
- **`auth/gsi-loader.adapter.ts`** (implements `GoogleIdentityPort`): moves ALL `window.google` / `__googleAuthInitDone` / script-injection logic out of the hook. Idempotent `<script>` inject → `onload` init, `onerror` ⇒ `script-load-failed`; missing clientId ⇒ `missing-client-id`; empty credential ⇒ `no-credential`.
- **`composition.ts`** (D6): `createAuthAdapter()`, `createSessionAdapter()` — env reads centralized here.

### App/UI changes (before → after responsibility; not full code)
| File | After |
|------|-------|
| `src/app/login/actions.ts` | Thin `"use server"` adapter: build adapters via `composition`, run `signInWithGoogle`, `redirect("/")` on success; catch typed errors → return `{ ok:false, code }`. No logging, no IP fallback. |
| `src/ui/hooks/use-google-auth.ts` | Thin UI hook: consumes injected `GoogleIdentityPort` (default = real adapter, fake in tests); wires container ref + callbacks; maps `GsiError` → Spanish copy. No window/script logic. |
| `src/ui/components/login-card.tsx` | Keeps local loading/error UI state (legit UI state); maps action's `code` → Spanish copy via a small UI map. Rendering tests deferred. |
| `src/app/page.tsx` | `getCurrentSession()` → `null` ⇒ `redirect("/login")`; render `session.user.name`. No inline parse/verify. |
| `src/app/profile/page.tsx` | Same guard; render from domain `User`; drop local `User` interface; guard `pictureUrl === null` (fallback avatar); `createdAt` still parsed to `Date` for display. |
| `src/app/api/logout/route.ts` | `signOut()` then `NextResponse.redirect("/login", 303)`. Deletion moves into `clear()`. |
| `vitest.config.mts`, `package.json` | Add `@testing-library/react` + `jsdom` (+`@testing-library/jest-dom`) dev deps; keep global `node`, opt jsdom per-file via pragma (D5). |

## Data Flow

    Login:
      LoginCard ─▶ useGoogleAuth ◀─ GoogleIdentityPort (GSI adapter: script + window.google)
                        │ credential(idToken)
                        ▼
              googleLogin(idToken)  [Server Action = composition root]
                        ▼
              signInWithGoogle({auth,session})
                   ├─▶ AuthPort.exchange ─▶ POST /api/v1/auth/google ─▶ mapper ─▶ Session
                   └─▶ SessionPort.create ─▶ signed jwt + user cookies
                        ▼  redirect("/")

    Guard (RSC page.tsx / profile):        Logout (POST /api/logout):
      getCurrentSession ─▶ SessionPort.get   signOut ─▶ SessionPort.clear ─▶ delete jwt+user
        null ⇒ redirect("/login")            ─▶ redirect("/login", 303)
        session ⇒ render

## Testing Strategy (TDD — `strict_tdd: true`, zero existing tests)

Sequence (red first each step):
1. **Characterization contract FIRST**: encode current observable behavior as failing expectations the new code must satisfy — cookie names `jwt`/`user`, flags, `maxAge` 7d, redirect `/` (login) and `/login` (logout), backend request URL/body. They fail because adapters don't exist yet.
2. **Mapper** (node): field-by-field DTO→User, `pictureUrl` null-coalesce, `role` passthrough, `createdAt` passthrough (decision #6 cases).
3. **Use cases** (node, mocked ports): success persists+returns; empty idToken→`InvalidCredentials`; port errors propagate; `getCurrentSession` null path; `signOut` calls `clear`.
4. **Backend adapter** (node, fetch mocked): 200→Session; 401/403→`InvalidCredentials`; 5xx/network→`BackendUnavailable`; malformed→`BackendUnavailable`; asserts request shape AND a console spy proving NO idToken logging.
5. **Cookie adapter + hmac** (node, faked `cookies()`): create sets both cookies w/ correct flags + signed value; get verifies + returns; tampered→null; missing→null; legacy plain-JSON→null; clear deletes both; HMAC sign/verify roundtrip + tamper detection.
6. **GSI adapter** (jsdom pragma): idempotent single script tag; onload→init; onerror→`script-load-failed`; missing clientId→`missing-client-id`; empty credential→`no-credential`. Hook test w/ fake port: `GsiError`→Spanish copy mapping.

| Layer | Test | Env | Focus |
|-------|------|-----|-------|
| Domain | unit | node | error construction / tags |
| Application | unit + port mocks | node | use-case orchestration |
| Infra (mapper, backend, cookie, hmac) | unit/contract | node | translation + integrity + error mapping |
| Infra (GSI) + hook | non-visual | jsdom | script lifecycle, error→copy |
| **UI (`login-card` rendering)** | **DEFERRED** | — | out of design scope (future redesign) |

## Migration / Rollout

Force re-login (D3): existing unsigned `user` cookies verify-fail → treated as no session → one redirect to `/login`. No data migration either direction. Pure refactor on a feature branch; revert restores the monolith. New env: `SESSION_SECRET` (required), `BACKEND_URL` (now required, no fallback).

## Open Questions

- [ ] `SESSION_SECRET` provisioning in deploy env — confirm it exists before merge (blocks runtime, not design).
- [ ] `@testing-library/jest-dom` — include now or defer with the rendering tests? (Leaning: install now, unused until redesign.)
```

# Session Authentication Specification

## Purpose

Formalizes the SHIPPED login flow — GSI button → ID token → server-side exchange with the external backend → `jwt`/`user` session cookies — as ports (`AuthPort`, `SessionPort`), use cases (`signInWithGoogle`, `getCurrentSession`, `signOut`), and adapters. Supersedes the never-built PKCE flow proposed in `oauth-login-flow`, which is NOT adopted. Scenarios below are testable at the domain/application/infraestructure level; component-rendering tests are out of scope (see Non-Goals).

## Requirements

### Requirement: Google Sign-In

The system MUST let a user authenticate via the GSI client button: obtain an ID token in the browser, then exchange it for a session through a server-side use case (`signInWithGoogle`).

#### Scenario: Successful sign-in
- GIVEN a user clicks "Continuar con Google" and Google issues a credential
- WHEN `signInWithGoogle` exchanges the ID token with the backend and receives a token + user payload
- THEN the system creates a session and redirects to `/`

#### Scenario: Google denies or fails to issue a token
- GIVEN the GSI callback executes
- WHEN no credential is returned, or the GSI script fails to load/initialize
- THEN `signInWithGoogle` MUST surface a domain error to the caller and MUST NOT create a session

#### Scenario: Backend exchange failure
- GIVEN a valid ID token is exchanged with the backend
- WHEN the backend responds with a non-2xx status or a payload missing `token`/`user`
- THEN `signInWithGoogle` MUST return `InvalidCredentials` or `BackendUnavailable` and MUST NOT set session cookies

### Requirement: Session Creation and Integrity

The session adapter MUST persist the session in cookies whose value can be integrity-verified (e.g., signed) before any reader trusts it. The flow MUST NOT log the raw ID token, the raw backend response body, or any other sensitive payload.

#### Scenario: Session persisted after sign-in
- GIVEN a successful backend exchange
- WHEN the session is created
- THEN an httpOnly `jwt` cookie and a `user` session cookie are set, both integrity-verifiable, preserving current names, flags, and lifetime

#### Scenario: No sensitive logging
- GIVEN any step of the sign-in flow, success or failure
- WHEN the flow executes
- THEN the raw ID token and raw backend response body MUST NOT appear in logs

### Requirement: Session Read and Verification

`SessionPort`/`getCurrentSession` MUST verify a session's integrity before returning an authenticated user.

#### Scenario: Valid signed session
- GIVEN a request carries a session cookie with an intact signature
- WHEN the session is read
- THEN the system returns the authenticated `User`

#### Scenario: Missing session
- GIVEN no session cookie is present
- WHEN the session is read
- THEN the system returns "no session" (unauthenticated), without creating an error

#### Scenario: Tampered or unsigned session
- GIVEN a session cookie exists but fails signature/integrity verification (including any legacy unsigned plain-JSON cookie)
- WHEN the session is read
- THEN the system MUST treat the request as unauthenticated (`SessionInvalid`) and MUST NOT trust the cookie payload — forcing re-login, with no legacy-format compatibility path

### Requirement: Logout

The system MUST provide `signOut`, clearing the session and its cookies.

#### Scenario: Successful logout
- GIVEN an authenticated session
- WHEN the user submits logout
- THEN `jwt` and `user` cookies are cleared and the user is redirected to `/login`

### Requirement: Guarded Pages

`/` and `/profile` MUST gate rendering on `getCurrentSession`, redirecting to `/login` when no valid session exists.

#### Scenario: Unauthenticated access to `/` or `/profile`
- GIVEN no session, or a session that fails verification
- WHEN a user requests `/` or `/profile`
- THEN the system redirects to `/login`

#### Scenario: Authenticated access
- GIVEN a valid, verified session
- WHEN a user requests `/` or `/profile`
- THEN the page renders using the session's `User`

### Requirement: Domain Error Taxonomy

The system MUST expose typed, framework-free domain errors defined in `domain/`: `InvalidCredentials` (backend rejects/malforms the exchange), `BackendUnavailable` (network or non-2xx failure), `SessionInvalid` (missing/tampered session). The UI MUST map each to user-facing copy without leaking raw backend/error strings.

#### Scenario: Error mapping in the UI
- GIVEN a use case throws or returns one of the three domain errors
- WHEN the UI hook receives it
- THEN it MUST display an error-specific Spanish message, never the raw backend/exception string

## Non-Goals

- PKCE / Authorization-Code flow, `/api/auth/callback` (superseded `oauth-login-flow`; never implemented).
- Visual, rendering, snapshot, or interaction tests for `login-card.tsx` or any UI component — deferred to a future redesign. `@testing-library/react` + `jsdom` are installed as dev deps for that future use; no component test exists yet.
- Full reconciliation of `domain/user.model.ts` (`isActive`, `picture`, `Role` union) with the backend/cookie DTO (`pictureUrl`, `createdAt`, `role: string`) — the mapper owns translation; the DTO shape is not specified into the domain.
- Token refresh, RBAC, new product features, backend contract changes.

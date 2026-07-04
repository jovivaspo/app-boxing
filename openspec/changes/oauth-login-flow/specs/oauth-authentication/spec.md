# OAuth Authentication Specification

## Purpose

Defines the Google OAuth 2.0 Authorization Code + PKCE flow, JWT session creation, and session verification. Covers the port interface, adapter contract, login initiation, callback handling, and cookie-based session management.

## Requirements

### Requirement: OAuth Port Interface

The system MUST define an `OAuthPort` interface in the application layer with three methods:

- `generateAuthUrl(redirectUri: string): Promise<string>` — returns an authorization URL containing `state` and `code_challenge` parameters.
- `exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>` — exchanges an authorization code for access and ID tokens.
- `verifySession(token: string): Promise<User | null>` — verifies a JWT session token and returns the user identity or null.

The port SHALL be framework-agnostic — it MUST NOT import React, Next.js, fetch, or any UI library.

#### Scenario: Generate authorization URL

- GIVEN a valid redirect URI is provided
- WHEN `generateAuthUrl` is called
- THEN the returned URL contains `state`, `code_challenge`, and `code_challenge_method=S256` parameters

#### Scenario: Exchange authorization code

- GIVEN a valid authorization code and redirect URI
- WHEN `exchangeCode` is called
- THEN the system returns an object containing `access_token` and `id_token`

#### Scenario: Verify session token

- GIVEN a valid, non-expired JWT session token
- WHEN `verifySession` is called
- THEN the system returns a User object with id, email, name, picture, and role

#### Scenario: Expired session token

- GIVEN an expired JWT session token
- WHEN `verifySession` is called
- THEN the system returns null

### Requirement: Initiate OAuth Login

The system MUST provide a mechanism to initiate the OAuth login flow that:

1. Generates a cryptographically random `code_verifier` (minimum 43 characters).
2. Computes a SHA-256 `code_challenge` from the verifier.
3. Generates a random `state` parameter for CSRF protection.
4. Stores `code_verifier` and `state` in httpOnly cookies before redirecting.
5. Redirects the browser to the OAuth provider's authorization endpoint.

#### Scenario: Successful login initiation

- GIVEN the user requests to sign in with Google
- WHEN the login initiation action executes
- THEN `code_verifier` and `state` cookies are set with httpOnly, Secure, SameSite=Lax attributes
- AND the browser is redirected to Google's OAuth authorization URL

#### Scenario: Cookie path restriction

- GIVEN login initiation sets cookies
- WHEN cookies are stored
- THEN `code_verifier` and `state` cookies MUST have Path=/api/auth/callback

### Requirement: OAuth Callback Handling

The system MUST handle the OAuth callback at a dedicated route that:

1. Validates the returned `state` matches the cookie-stored `state`.
2. Exchanges the authorization code for tokens.
3. Verifies the `id_token` before creating a session.
4. Clears `code_verifier` and `state` cookies after use.
5. Creates a JWT session token and stores it in an httpOnly cookie.
6. Redirects to `/` on success.

#### Scenario: Successful callback

- GIVEN the OAuth provider redirects back with a valid code and matching state
- WHEN the callback route processes the request
- THEN the authorization code is exchanged for tokens
- AND the id_token is verified
- AND code_verifier and state cookies are cleared
- AND a JWT session cookie named `auth_token` is set (httpOnly, Secure, SameSite=Lax)
- AND the user is redirected to `/`

#### Scenario: State mismatch

- GIVEN the OAuth provider redirects back with a state that does not match the cookie
- WHEN the callback route processes the request
- THEN the user is redirected to `/login?error=invalid_state`
- AND no session cookie is created

#### Scenario: User denied consent

- GIVEN Google returns `access_denied` error
- WHEN the callback route processes the request
- THEN the user is redirected to `/login?error=access_denied`

#### Scenario: Token exchange failure

- GIVEN the token endpoint returns an error
- WHEN the callback route processes the request
- THEN the user is redirected to `/login?error=token_exchange_failed`
- AND Google's internal error details are NOT exposed to the client

#### Scenario: Invalid id_token

- GIVEN the id_token fails verification (expired, wrong audience, invalid signature)
- WHEN the callback route processes the request
- THEN the user is redirected to `/login?error=invalid_token`

### Requirement: JWT Session Token

The JWT session token MUST contain user identity claims: id, email, name, picture, and role. The token MUST expire after 24 hours. The token MUST be signed with a secret that is never exposed to the client.

#### Scenario: Session token contents

- GIVEN a successful OAuth flow
- WHEN the JWT session token is created
- THEN it contains sub (user id), email, name, picture, role, and exp claims

#### Scenario: Session token expiry

- GIVEN a JWT session token was created 25 hours ago
- WHEN the token is verified
- THEN verification fails and returns null

### Requirement: Cookie Security

All authentication cookies MUST use httpOnly, Secure, and SameSite=Lax flags. One-time-use cookies (state, code_verifier) MUST be cleared after the callback completes. The Google client secret MUST never be exposed to the client.

#### Scenario: Auth token cookie attributes

- GIVEN a successful authentication
- WHEN the auth_token cookie is set
- THEN it has httpOnly=true, Secure=true, SameSite=Lax

#### Scenario: One-time cookie cleanup

- GIVEN the callback completes (success or failure)
- WHEN cookies are inspected after the response
- THEN code_verifier and state cookies are absent

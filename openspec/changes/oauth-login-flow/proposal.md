# Proposal: Google OAuth Login Flow

## Intent

Wire the existing "Continuar con Google" button to initiate and complete a Google OAuth 2.0 Authorization Code + PKCE flow. Create JWT-based session management so authenticated users reach the home page instead of being unconditionally redirected to `/login`.

## Scope

### In Scope
- `application/ports/auth.port.ts` — `OAuthPort` interface (generateAuthUrl, exchangeCode, verifySession)
- `infraestructure/adapters/google-oauth.adapter.ts` — implements `OAuthPort` with Google APIs
- `infraestructure/server-actions/auth.ts` — `signInWithGoogle` Server Action (generates PKCE state, sets cookies, redirects)
- `src/app/api/auth/callback/route.ts` — OAuth callback handler (validates state/PKCE, exchanges code, creates JWT session)
- `src/ui/components/login-card.tsx` — convert to Client Component, wire button to `signInWithGoogle`
- `src/app/page.tsx` — check session cookie; redirect to `/login` only if unauthenticated
- `.env.local.example` — template with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`

### Out of Scope
- User registration or auto-creation (assumed to exist or handled later)
- Token refresh / offline access / refresh tokens
- Logout or session revocation
- Role-based access control
- Protected area UI beyond placeholder home page
- Test suite setup (`strict_tdd: false`)

## Capabilities

### New Capabilities
- `oauth-authentication`: Google OAuth 2.0 authorization code + PKCE flow, JWT session creation, and session verification. Covers the port interface, adapter implementation, Server Action, API callback route, and cookie-based session management.

### Modified Capabilities
- `login-page`: Root path redirect logic changes from unconditional `/login` redirect to conditional redirect (only when unauthenticated). LoginCard becomes a Client Component with a button wired to the `signInWithGoogle` Server Action. Error state via `?error=` query param displayed on the login page.

## Approach

Follow Clean Architecture (domain ← application ← infraestructure):
1. **Port** (`application/ports/auth.port.ts`): define `OAuthPort` with `generateAuthUrl()`, `exchangeCode()`, `verifySession()`.
2. **Adapter** (`infraestructure/adapters/`): implement `OAuthPort` using `googleapis` or raw fetch + `jsonwebtoken`.
3. **Server Action** (`infraestructure/server-actions/`): generate PKCE code_verifier via `crypto.randomBytes`, store in httpOnly cookie, redirect to Google.
4. **Route Handler**: `/api/auth/callback` validates `state`, exchanges code for tokens, verifies id_token, creates JWT stored in httpOnly/Secure/SameSite=Lax cookie, redirects to `/`.
5. **LoginCard**: add `"use client"`, call Server Action on button click. Read `?error=` from searchParams to display error messages.
6. **Home page**: read JWT cookie server-side; redirect to `/login` only if cookie absent or invalid.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/application/ports/` | New | `auth.port.ts` — OAuthPort interface |
| `src/infraestructure/adapters/` | New | `google-oauth.adapter.ts` |
| `src/infraestructure/server-actions/` | New | `auth.ts` — signInWithGoogle action |
| `src/app/api/auth/callback/` | New | `route.ts` — callback handler |
| `src/ui/components/login-card.tsx` | Modified | Client Component + click handler + error display |
| `src/app/page.tsx` | Modified | Conditional redirect |
| `src/app/login/page.tsx` | Modified | Pass/receive error state |
| `.env.local.example` | New | Required env vars template |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Redirect URI mismatch with Google Cloud Console | High | Document exact URI in setup instructions |
| JWT secret missing in dev environment | Medium | Generate with `openssl rand -base64 32`; document in .env.local.example |
| No automated tests | Medium | Manual verification via `npm run build`, `npm run lint`, `npx tsc --noEmit` |
| Cookie not accessible server-side after redirect | Low | Verify SameSite=Lax allows same-origin redirect; test in dev |

## Rollback Plan

1. Revert `src/app/page.tsx` to unconditional `redirect("/login")`
2. Delete `src/application/ports/auth.port.ts`, `infraestructure/adapters/google-oauth.adapter.ts`, `infraestructure/server-actions/auth.ts`, `src/app/api/auth/`
3. Revert LoginCard to Server Component (remove `"use client"`, remove button handler)
4. Delete `.env.local.example`

## Dependencies

- Google Cloud Console project with OAuth 2.0 credentials (Client ID, Client Secret)
- `jsonwebtoken` npm package (add to dependencies)
- `next` cookies API (`next/headers`)

## Success Criteria

- [ ] Clicking "Continuar con Google" redirects user to Google consent screen
- [ ] After consent, user is redirected back and a JWT session cookie is set
- [ ] Authenticated users landing on `/` stay on `/` (no redirect to `/login`)
- [ ] Unauthenticated users landing on `/` are redirected to `/login`
- [ ] OAuth errors (access_denied, invalid_grant) redirect to `/login?error=...` with visible message
- [ ] `npm run build` and `npm run lint` pass
- [ ] `npx tsc --noEmit` passes with strict mode

# Exploration: oauth-login-flow

**Status:** success  
**Next recommended:** proposal  
**Date:** 2026-07-02

## Executive Summary

The project has a login page with a Google button but no click handler. All Clean Architecture layers above domain are empty. To implement the full Google OAuth flow (redirect + callback), we need: an OAuth port in application/, a GoogleOAuthAdapter in infraestructure/, a Server Action to trigger the redirect, a callback route to exchange the code for tokens, JWT session management, and LoginCard converted to a Client Component. Tests are not configured; strict_tdd is false.

## Codebase State

| Layer | Status |
|---|---|
| UI | LoginCard is Server Component. Button has no onClick/action. page.tsx redirects / → /login. |
| Domain | User interface defined with 6 fields. Role type: "admin" | "user". |
| Application | Empty directory. |
| Infrastructure | Empty directory. |
| App Routes | Only / (redirects to /login) and /login. No API routes, no server actions. |
| Testing | Not configured. No vitest/jest runner. strict_tdd: false. |
| Styling | Tailwind v4, shadcn/ui (neutral), Inter font. |

## Authentication Flow (from README)

1. User clicks "Sign in with Google"
2. Frontend redirects to Google OAuth consent screen
3. Google returns authorization code
4. Frontend sends code to backend
5. Backend exchanges code for tokens
6. Session created (JWT)
7. User redirected to protected area

## Architecture Recommendations

```
src/
├── application/
│   └── ports/
│       └── auth.port.ts          # OAuthPort interface
├── infraestructure/
│   ├── adapters/
│   │   └── google-oauth.adapter.ts  # Implements OAuthPort
│   └── server-actions/
│       └── auth.ts                  # Server Action adapter
├── app/
│   ├── login/
│   │   └── page.tsx              # Updated: LoginCard calls Server Action
│   └── api/
│       └── auth/
│           └── callback/
│               └── route.ts      # OAuth callback handler
```

## Security Requirements

- **PKCE**: code_verifier generated server-side with crypto.randomBytes, stored in httpOnly cookie
- **State**: anti-CSRF parameter, validated on callback
- **Secrets**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in .env.local
- **Session**: JWT stored in httpOnly, Secure, SameSite=Lax cookie
- **Redirect URI**: Must match Google Cloud Console exactly

## User Decisions (from proposal question round)

- Scope: Full flow (redirect + callback)
- Session: JWT in httpOnly cookie
- Post-login redirect: Home (/)
- Error UX: Back to /login?error=access_denied with message

## Risks

- No test runner configured; testing will be manual (build + lint + typecheck)
- flow.png and flow-frontend-layer.png could not be read (model limitation)
- Google Cloud Console must have matching redirect_uri configured
- Need to generate a JWT secret for signing

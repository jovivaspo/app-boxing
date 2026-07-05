# Exploration: refactor-login-hexagonal-tdd

**Status:** partial
**Next recommended:** sdd-propose
**Date:** 2026-07-05

## Executive Summary

The shipped login implementation bypasses every hexagonal boundary defined in AGENTS.md and has zero test coverage despite `strict_tdd: true`. It also does not match the flow described in the still-open `oauth-login-flow` change (PKCE Authorization Code flow): what was actually built is a client-side Google Identity Services (GSI) button that gets an ID token and hands it to a monolithic Server Action, which talks to an external backend and sets `jwt`/`user` cookies directly. `application/` and `infraestructure/` do not exist for this feature at all.

## Violations Found (file:line)

| File | Violation |
|---|---|
| `src/app/login/actions.ts:8-65` | God Server Action: backend fetch, cookie/session creation, error mapping, redirect all inline in `app/`. No port/use case. Logs raw idToken (line 9) and full backend response (line 17). Hardcoded private-IP fallback (line 6). |
| `src/ui/hooks/use-google-auth.ts:1-111` | "UI hook" that is actually an infrastructure adapter — loads Google's 3rd-party script, manages `window.google` / `window.__googleAuthInitDone` globals. No port behind it. |
| `src/ui/components/login-card.tsx:1-68` | Calls the Server Action directly (lines 12, 24) — Component-calls-API-directly anti-pattern. Owns loading/error state itself (God Component). |
| `src/app/page.tsx:1-15`, `src/app/profile/page.tsx:15-29` | Session-cookie reading/parsing duplicated inline in two Server Components. No signature verification of the `user` cookie. No use case/port abstraction. |
| `src/app/api/logout/route.ts:1-12` | Session teardown (cookie deletion) inline in the route handler. |
| `src/domain/user.model.ts` | Only compliant file — pure interface, no framework imports — though anemic. |

Confirmed via glob: `src/application/` and `src/infraestructure/` do not exist for this feature.

## Testing State

Zero `*.test.ts` / `*.spec.ts` files under `src/`. `@testing-library/react` and `jsdom` are not installed; `vitest.config.mts` is `environment: 'node'` only, so component-level TDD is currently impossible without adding those dependencies first. `strict_tdd: true` is active for this project per `sdd-init` capabilities, so this is a live gap, not a historical decision.

## Conflict With `oauth-login-flow` (open, unimplemented change)

`openspec/changes/oauth-login-flow/proposal.md` and its spec describe a PKCE Authorization-Code flow: `OAuthPort` (`generateAuthUrl`/`exchangeCode`/`verifySession`), `/api/auth/callback` route, PKCE `code_verifier`, `auth_token` JWT cookie. That change has **no design, no tasks, no apply** — it was never built.

What shipped instead: GSI button (client-side) → ID token → Server Action posts token to an external backend → backend returns `jwt`/`user` → cookies set directly by the Server Action. No PKCE, no `/api/auth/callback`, no `auth_token` cookie — different port contract entirely.

This must be resolved explicitly before design: does the refactor target the **PKCE flow already specified**, or does it **formalize the GSI + backend-delegation flow that is actually running in production**, hexagonalized? The answer changes the `OAuthPort` contract, the adapter, and whether `oauth-login-flow` gets archived/superseded.

## Risks

- Flow-shape conflict above must be reconciled before `sdd-propose`.
- Retroactive TDD requires installing `@testing-library/react` + `jsdom` first.
- `use-google-auth.ts`'s window-global state needs an adapter/fake boundary to be unit-testable without a DOM.
- Sensitive idToken/backend-response logging and hardcoded LAN-IP fallback in `actions.ts` should be flagged for cleanup alongside the architecture fix.
- No JWT/id_token verification anywhere client-visible — `user` cookie is trusted as plain JSON.

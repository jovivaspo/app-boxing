# Proposal: Refactor Login to Hexagonal + TDD

## Intent

The shipped login (GSI client button → ID token → monolithic Server Action → external backend → `jwt`/`user` cookies) violates every Clean/Hexagonal boundary in AGENTS.md, has zero tests despite `strict_tdd: true`, and carries live security defects (raw idToken/backend-response logging, hardcoded private-IP fallback, `user` cookie trusted as plain JSON). This refactor formalizes the flow that is ACTUALLY running — hexagonalized behind ports/adapters and backed by TDD — while preserving current login/logout behavior (same UX, same cookies, same redirects). It does NOT adopt the PKCE flow in `oauth-login-flow`, which is superseded here (never built).

## Scope

### In Scope
- Ports in `application/ports/`: `AuthPort` (exchange ID token → session) and `SessionPort` (read/verify/clear session).
- Use cases in `application/use-cases/`: `signInWithGoogle`, `getCurrentSession`, `signOut`.
- Adapters in `infraestructure/`: backend HTTP adapter, cookie session adapter (signature/integrity-verified), DTO↔domain mapper, GSI script loader adapter.
- Split `use-google-auth.ts`: GSI-loading infra adapter + thin UI hook mapping domain errors to copy.
- `login-card.tsx` calls a use case (not the action directly); `page.tsx`/`profile/page.tsx`/`api/logout/route.ts` consume ports (no inline cookie parsing).
- Security fixes: remove sensitive logging, remove hardcoded IP fallback, sign/verify session cookie.
- Testing deps: install `@testing-library/react` + `jsdom`; update `vitest.config.mts` (node for pure logic, jsdom for component tests). TDD-first per `strict_tdd: true`.
- Mark `openspec/changes/oauth-login-flow/` as superseded (cross-reference; archive bookkeeping at `sdd-archive`).

### Out of Scope
- Migrating to PKCE / Authorization-Code flow or `/api/auth/callback`.
- New product features, token refresh, RBAC, backend contract changes.
- Reconciling `domain/user.model.ts` shape beyond what the mapper needs (flagged below).
- Visual/rendering tests for `login-card.tsx` and any other UI component scheduled for redesign. `@testing-library/react` + `jsdom` are installed as dev dependencies in this change (so the next change doesn't start from zero), but component rendering/snapshot/interaction tests are deferred until the visual redesign lands — testing effort here focuses on domain/application/infraestructure logic (use cases, mapper, session adapter, GSI-loading adapter), which is node-testable and unaffected by the future visual rework.

## Capabilities

### New Capabilities
- `session-authentication`: GSI ID-token acquisition, backend token exchange, integrity-verified session cookie lifecycle (create/read/verify/clear), guarded pages, and logout — expressed as ports, use cases, and adapters.

### Modified Capabilities
- None. (`oauth-login-flow`'s `oauth-authentication` and `login-page` were proposed but never merged into `openspec/specs/`; they are SUPERSEDED by `session-authentication`, not modified.)

## Approach

Apply the dependency rule (domain ← application ← infraestructure; ui → application):
1. **Domain**: keep `User` pure; add typed domain errors (`InvalidCredentials`, `BackendUnavailable`, `SessionInvalid`).
2. **Application ports**: `AuthPort.exchange(idToken): Promise<Session>`, `SessionPort.get()/verify()/clear()`.
3. **Use cases**: orchestrate ports, return domain models/errors — no fetch, no `next/*`.
4. **Infraestructure**: Server Action becomes a thin adapter (validate → call use case → map result); backend fetch + mapper (reconcile DTO `pictureUrl`/`createdAt`/`role` → domain `User`); cookie adapter signs/verifies the session payload instead of trusting raw JSON; GSI loader isolated behind an adapter/port so the UI hook is DOM-testable via a fake.
5. **UI last**: `login-card.tsx` drives a use case and maps typed errors to Spanish copy; RSCs (`page.tsx`, `profile/page.tsx`) inject `SessionPort` at the composition root; `api/logout/route.ts` calls `signOut`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/` | Modified | Domain errors; keep `User` framework-free |
| `src/application/ports/` | New | `AuthPort`, `SessionPort` |
| `src/application/use-cases/` | New | signInWithGoogle, getCurrentSession, signOut |
| `src/infraestructure/` | New | backend adapter, cookie session adapter, mapper, GSI loader |
| `src/app/login/actions.ts` | Modified | Thin adapter; remove logging + IP fallback |
| `src/ui/hooks/use-google-auth.ts` | Modified | Split infra loader vs UI hook |
| `src/ui/components/login-card.tsx` | Modified | Consume use case, not action directly |
| `src/app/page.tsx`, `src/app/profile/page.tsx` | Modified | Read session via `SessionPort` |
| `src/app/api/logout/route.ts` | Modified | Call `signOut` use case |
| `vitest.config.mts`, `package.json` | Modified | jsdom + testing-library, env config |
| `openspec/changes/oauth-login-flow/` | Modified | Marked superseded |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Behavior drift (cookies/redirects/UX change) | Med | Characterization tests first; assert same cookie names/flags/redirects |
| Signed cookie breaks existing sessions | Med | Force re-login: an unsigned/invalid session cookie is treated as unauthenticated, no legacy-format read path to maintain |
| GSI window-globals hard to unit-test | Med | Adapter/port boundary + fake in jsdom |
| jsdom/testing-library setup destabilizes node tests | Low | Per-file environment; keep pure logic on node |
| Domain/DTO shape mismatch (`user.model.ts`) | Med | Mapper owns translation; do not leak DTO into domain |

## Rollback Plan

Pure refactor on a feature branch — revert the branch/PR to restore the current monolithic implementation. Adapters/ports are additive; deleting new `application/` + `infraestructure/` files and reverting the five touched app/ui files returns to baseline. The signed-cookie transition forces re-login (no legacy plain-JSON read path), so rollback simply restores the old unsigned-cookie adapter — no data migration in either direction.

## Dependencies

- npm (dev): `@testing-library/react`, `jsdom` (and `@testing-library/jest-dom` if used).
- Cookie signing secret (env var, e.g. `SESSION_SECRET`) for integrity verification.
- Existing external backend `POST /api/v1/auth/google` (unchanged contract).

## Success Criteria

- [ ] Login/logout behavior unchanged: same GSI UX, same `jwt`/`user` cookies at completion, same `/` and `/login` redirects. Existing unsigned sessions require one re-login (expected, documented).
- [ ] `domain/` has zero React/Next/fetch imports; UI never calls the backend adapter directly; use cases have no framework imports.
- [ ] No sensitive logging; no hardcoded IP fallback; session cookie integrity-verified before trust.
- [ ] TDD-first: failing test precedes each unit of logic; domain/application tests need no jsdom or network.
- [ ] Coverage for use cases, mapper, session adapter, and the GSI-loading infra adapter's non-visual logic (error mapping, script-load lifecycle) — NOT `login-card.tsx` rendering, which is deferred to the redesign change.
- [ ] `@testing-library/react` + `jsdom` installed and `vitest.config.mts` configured (node for logic, jsdom available for the future redesign change) even though no component tests are written yet.
- [ ] `npm run test`, `npm run build`, `npx tsc --noEmit`, `npm run lint` all pass.
- [ ] `oauth-login-flow` cross-referenced as superseded.

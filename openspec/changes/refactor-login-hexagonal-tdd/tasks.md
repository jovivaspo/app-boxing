# Tasks: Refactor Login to Hexagonal + TDD (`session-authentication`)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1300–1500 (20+ new files incl. tests, 6 rewired entry points) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR6 (see Work Units) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (feature-branch-chain suggested — auth rollback control) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Domain + ports + test tooling deps (Phase 1–2) | PR 1 | ~150 lines. Base: tracker branch. No behavior change. |
| 2 | Use cases w/ mocked ports (Phase 5) | PR 2 | ~220 lines. Base: PR1 branch. |
| 3 | Mapper + backend HTTP adapter + characterization (Phase 3.2, 4, 6) | PR 3 | ~300 lines. Base: PR2 branch. Includes no-logging spy. |
| 4 | HMAC + cookie session adapter + characterization (Phase 3.1, 7) | PR 4 | ~330 lines. Base: PR3 branch. Highest security risk — signed cookie. |
| 5 | GSI loader adapter + hook rewrite (Phase 8) | PR 5 | ~300 lines. Base: PR4 branch. jsdom-only tests. |
| 6 | Composition root + 6 entry-point rewires + final verification (Phase 9–10) | PR 6 | ~250 lines. Base: PR5 branch. Merges tracker → main. |

## Phase 1: Test Tooling & Domain Foundation

- [x] 1.1 Install devDeps `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` — `package.json`
- [x] 1.2 [RED] Test: tagged errors construct w/ correct `_tag` — `src/domain/errors/auth-errors.test.ts`
- [x] 1.3 [GREEN] Implement `InvalidCredentials`, `BackendUnavailable`, `SessionInvalid` — `src/domain/errors/auth-errors.ts` (implemented as tagged factory functions `invalidCredentials`/`backendUnavailable`/`sessionInvalid`, not classes — see Deviations)
- [x] 1.4 Evolve `User`: drop `isActive`/`Role`, add `role: string`, `pictureUrl: string | null`, `createdAt: string` — `src/domain/user.model.ts`
- [x] 1.5 Add `Session { token, user }` — `src/domain/session.model.ts`

## Phase 2: Application Ports

- [x] 2.1 Define `AuthPort.exchange(idToken): Promise<Session>` — `src/application/ports/auth.port.ts`
- [x] 2.2 Define `SessionPort.create/get/clear` — `src/application/ports/session.port.ts`
- [x] 2.3 Define `GoogleIdentityPort.load/renderButton` + `GsiError` — `src/application/ports/google-identity.port.ts`

## Phase 3: Characterization Contract (RED — scaffold tests, adapters don't exist yet)

- [x] 3.1 [RED] Test scaffold: `jwt` httpOnly/secure(prod)/lax/`/`/7d maxAge; `user` now httpOnly true, same flags; legacy unsigned `user` cookie → `get()` null — `src/infraestructure/session/cookie-session.adapter.test.ts`
- [x] 3.2 [RED] Test scaffold: `POST ${BACKEND_URL}/api/v1/auth/google`, header `content-type: application/json`, body `{idToken}`; console spy proves no idToken/response logging — `src/infraestructure/auth/backend-auth.adapter.test.ts` (plus a legacy characterization/approval test suite added for current `src/app/login/actions.ts` behavior — `src/app/login/actions.characterization.test.ts`, passes immediately, no production code touched)

## Phase 4: Mapper

- [x] 4.1 [RED] Test: DTO→User (role passthrough, `pictureUrl` null-coalesce, `createdAt` passthrough); `toSession` wraps token+user — `src/infraestructure/auth/mappers/user.mapper.test.ts`
- [x] 4.2 [GREEN] Implement `backendAuthResponseSchema` (Zod) + `toUser`/`toSession` — `src/infraestructure/auth/dto/backend-auth.dto.ts`, `src/infraestructure/auth/mappers/user.mapper.ts`

## Phase 5: Use Cases (mocked ports)

- [x] 5.1 [RED] Test: success persists+returns; empty idToken→`InvalidCredentials`; port errors propagate — `src/application/use-cases/sign-in-with-google.test.ts`
- [x] 5.2 [GREEN] Implement `signInWithGoogle({auth,session})` — `src/application/use-cases/sign-in-with-google.ts`
- [x] 5.3 [RED] Test: returns session or null — `src/application/use-cases/get-current-session.test.ts`
- [x] 5.4 [GREEN] Implement `getCurrentSession({session})` — `src/application/use-cases/get-current-session.ts`
- [x] 5.5 [RED] Test: calls `session.clear()` — `src/application/use-cases/sign-out.test.ts`
- [x] 5.6 [GREEN] Implement `signOut({session})` — `src/application/use-cases/sign-out.ts`

## Phase 6: Backend HTTP Adapter

- [x] 6.1 [RED] Extend 3.2 test: 200→Session; 401/403→`InvalidCredentials`; 5xx/network→`BackendUnavailable`; malformed→`BackendUnavailable`
- [x] 6.2 [GREEN] Implement `AuthPort` — required `BACKEND_URL` (no IP fallback, D8), fetch+mapper, zero logging — `src/infraestructure/auth/backend-auth.adapter.ts`

## Phase 7: Session Cookie + HMAC Adapter

- [x] 7.1 [RED] Test: sign/verify roundtrip + tamper detection — `src/infraestructure/session/hmac.test.ts`
- [x] 7.2 [GREEN] Implement `sign`/`verify` (HMAC-SHA256, timing-safe) — `src/infraestructure/session/hmac.ts`
- [x] 7.3 [RED] Extend 3.1 test: `create` sets signed `user`(httpOnly)+`jwt`; `get` verifies/null (tampered/missing/legacy); `clear` deletes both; missing `SESSION_SECRET` fails closed
- [x] 7.4 [GREEN] Implement `SessionPort` via `next/headers` `cookies()` — `src/infraestructure/session/cookie-session.adapter.ts`

## Phase 8: GSI Loader Adapter + Hook

- [ ] 8.1 [RED] Test (jsdom pragma): idempotent script tag; `onload`→init; `onerror`→`script-load-failed`; missing clientId→`missing-client-id`; empty credential→`no-credential` — `src/infraestructure/auth/gsi-loader.adapter.test.ts`
- [ ] 8.2 [GREEN] Implement `GoogleIdentityPort` — `src/infraestructure/auth/gsi-loader.adapter.ts`
- [ ] 8.3 [RED] Test (jsdom, fake port): hook wires ref+callbacks; maps `GsiError`→Spanish copy — `src/ui/hooks/use-google-auth.test.ts`
- [ ] 8.4 [GREEN] Rewrite hook to consume injected `GoogleIdentityPort` (default = real adapter) — `src/ui/hooks/use-google-auth.ts`

## Phase 9: Composition Root + Entry-Point Rewiring

- [ ] 9.1 Implement `createAuthAdapter()`/`createSessionAdapter()` — `src/infraestructure/composition.ts`
- [ ] 9.2 Rewrite `googleLogin`: composition→`signInWithGoogle`→redirect `/`; typed-error catch→`{ok:false,code}`; remove logging + IP fallback — `src/app/login/actions.ts`
- [ ] 9.3 Update `LoginCard` to map action `code`→Spanish copy — `src/ui/components/login-card.tsx`
- [ ] 9.4 Rewire `page.tsx`: `getCurrentSession()` null⇒redirect `/login`; render `session.user.name` — `src/app/page.tsx`
- [ ] 9.5 Rewire `profile/page.tsx`: same guard; drop local `User` interface; render domain `User`; guard `pictureUrl===null` — `src/app/profile/page.tsx`
- [ ] 9.6 Rewire logout route: `signOut()`→redirect `/login` 303 — `src/app/api/logout/route.ts`

## Phase 10: Final Verification

- [ ] 10.1 `npm run test` — all suites green
- [ ] 10.2 `npx tsc --noEmit`
- [ ] 10.3 `npm run lint`
- [ ] 10.4 `npm run build`
- [ ] 10.5 Confirm `SESSION_SECRET`/`BACKEND_URL` required, no fallback, documented (`.env.example` if present)

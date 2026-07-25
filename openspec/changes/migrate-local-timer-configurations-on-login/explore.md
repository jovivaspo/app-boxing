# Exploration: migrate-local-timer-configurations-on-login (Issue #20)

## Current State

- Port `TimerConfigurationRepositoryPort` (`src/application/ports/timer-configuration-repository.port.ts`): `create(Omit<TimerConfiguration,"id">)`, `list()`, `update(config)`, `delete(id)`.
- Local adapter `createLocalTimerConfigurationAdapter()` (`src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts`): browser-only, single JSON blob under localStorage key `"timer-configurations"`, built on `getItem`/`setItem` from `src/infraestructure/storage/localStorage.ts` (plain util, not a port — D2 decision, SSR-safe, single consumer). `create()` throws under SSR (no silent data loss); `list()`/`update()`/`delete()` degrade gracefully or throw `timerConfigurationNotFound`.
- Backend adapter `createBackendTimerConfigurationAdapter(token: string)` (`src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts`): requires `BACKEND_URL` env (fail-closed) and a bearer `token` (the session's opaque JWT) sent as `Authorization: Bearer <token>` on every call.
- Use case `createTimerConfiguration({ repository })` (`src/application/use-cases/create-timer-configuration/create-timer-configuration.ts`): validates via `validateTimerConfiguration` then calls `repository.create()` — one item at a time, no batch API. `listTimerConfigurations({ repository })` is a thin wrapper over `repository.list()`.
- **Critical gap confirmed**: no composition root exists anywhere in `src/app/**` for either timer-configuration adapter — verified both by `Glob` (no timer-config route/page files) and by the prior change's own verify-report, which explicitly documents "no `src/app/**timer-config**` files exist" as a correct non-goal of #19. Issue #20 will be the FIRST real wiring of these adapters into a live flow.
- Login flow: `googleLogin` Server Action (`src/infraestructure/actions/google-login/google-login.action.ts`) composes `signInWithGoogle({ auth, session })(idToken)`; on success it calls Next.js `redirect("/")`, which throws internally — nothing after a successful `signInWithGoogle` call inside `googleLogin` executes except the redirect, and nothing on the client side runs after `await googleLogin(...)` resolves on the happy path either (the throw propagates through the client boundary; `login-card.hook.ts` already special-cases this with `unstable_rethrow(err)` in its catch). This means "trigger after successful login" cannot mean "run more client code after `googleLogin()` returns" on the happy path — the redirect pre-empts it.
- Session: `SessionPort.get()` (`src/infraestructure/session/cookie-session.adapter.ts`) reads the httpOnly `jwt`/`user` cookies server-side and returns `{ token, user } | null`. The bearer token needed by the backend adapter is only obtainable server-side (httpOnly cookie, unreadable by client JS).
- localStorage shape: array of `TimerConfiguration` (each with generated `id`) under one key, read via the local adapter's `list()` (no separate raw "list all local configs" export exists, but the adapter already covers it — not a real gap).
- Testing patterns: Vitest, `__tests__/` siblings, `// @vitest-environment jsdom` docblock for anything touching `window`; port mocked via `makeTimerConfigurationRepositoryPort()` factory in `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts`; builder `buildTimerConfiguration()`; Server Action tests mock adapter/use-case modules with `vi.mock` + `vi.fn()` and dynamic `await import(...)`.

## Affected Areas

- `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts` — source of local configs to migrate; `delete(id)` used to clear successfully-migrated entries.
- `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` — target of migration, needs the session token.
- `src/application/use-cases/create-timer-configuration/create-timer-configuration.ts` — reusable per-item creation, no batch variant exists.
- `src/infraestructure/actions/google-login/google-login.action.ts` and `src/application/use-cases/sign-in-with-google/sign-in-with-google.ts` — the "successful login" boundary; redirect-on-success makes them awkward to extend in-place without touching already-shipped/tested auth code.
- `src/ui/components/login-card/login-card.hook.ts` — only existing hook that observes login success today, but cannot run more code after success due to redirect.
- `src/infraestructure/session/cookie-session.adapter.ts` — only place the bearer token can be read (server-side).
- No existing file at the eventual migration trigger site (new Server Action + new hook needed) — greenfield.

## Approaches

1. **Extend the login Server Action itself to accept local configs and migrate inline before redirect** — client reads local configs first (via local adapter, A1), passes them as a new parameter to a modified `googleLogin(idToken, localConfigs)`; the action composes `createBackendTimerConfigurationAdapter(session.token)` + `createTimerConfiguration`, loops with per-item try/catch, then still redirects.
   - Pros: single request/response round trip; migration guaranteed to run exactly at the login event.
   - Cons: violates SRP — couples an unrelated bounded context (timers) into the auth action; touches already-shipped, fully-tested `google-login.action.ts`/tests (regression risk); signature bloat; migration failure handling gets entangled with login's own error-code mapping.

2. **Dedicated Server Action (new `migrate-timer-configurations` folder) triggered by a new client hook mounted on the post-login landing page** — client reads local configs via the local adapter (A1 exception: overridable param + module-level default, justified in the PR body), calls the new action with the config payload (each item tagged with its local `id` for correlation, since the port's `create()` drops `id`); the action reads the session server-side (`createCookieSessionAdapter().get()`), composes `createBackendTimerConfigurationAdapter(token)` + `createTimerConfiguration`, loops per item with independent try/catch, returns per-item success/failure; the hook then calls the local adapter's `delete(id)` only for the ids that succeeded, leaving failures in place for retry.
   - Pros: zero changes to already-tested auth code; single-responsibility Server Action; naturally idempotent and partial-failure-safe (delete-on-success, per item); satisfies "on login" since it mounts on the page `redirect("/")` already sends the user to; respects A2 (Server Action call lives in the new `.hook.ts`, not in any `.tsx`).
   - Cons: needs a new mount point (no client wrapper exists yet on `/`); running on every authenticated page load rather than strictly the login submit event is a looser interpretation of "on login" (though behaviorally equivalent given idempotency).

## Recommendation

Approach 2. It keeps the already-verified auth path untouched, fits the existing A1/A2 rules exactly, and naturally satisfies the idempotency + partial-failure acceptance criteria via per-item delete-on-success rather than needing a new "migrated" flag on the domain model.

## Risks / Open Questions (for design phase)

- The port's `create()` signature strips `id`, so the new migration Server Action needs its own request/response shape (not the port) to correlate local `id` -> success/failure — worth an explicit design decision, not a port change.
- No mount point exists yet for a "runs once after login" client hook; needs a Server Component page (`/`, `src/app/page.tsx`) to host a new client wrapper, or reuse of an existing client boundary if one appears in a dependency change.
- `TimerConfiguration` domain model has no "migrated" flag; recommend delete-on-success over flagging to avoid a domain/schema change.
- `BACKEND_URL`/token-missing fail-closed behavior in `createBackendTimerConfigurationAdapter` must be handled gracefully by the new action (e.g., treat as "migrate later" rather than crashing the page).
- Design phase must decide whether migration blocks page render or fires fire-and-forget on mount.

## Ready for Proposal

Yes — architecture, ports, adapters, and the login boundary constraint are all confirmed against real code; the two viable approaches and the correlation-id gap are the key decisions for `sdd-propose`/`sdd-design` to settle.

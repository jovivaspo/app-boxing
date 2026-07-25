# Proposal: Migrate Local Timer Configurations on Login

## Intent

Guests create timer configurations stored only in `localStorage` (guest adapter). When a guest logs in, that work is invisible on the backend and lost across devices. This change migrates any local configurations to the backend on login so a user's guest work survives authentication, silently and without conflict resolution (always "create new" on the backend). Closes Issue #20; depends on #19 (port, adapters, CRUD use cases — already shipped and verified).

## Scope

### In Scope

- New dedicated Server Action that migrates local timer configurations to the backend: reads the session token server-side, composes `createBackendTimerConfigurationAdapter(token)` + `createTimerConfiguration` per item, returns per-item success/failure.
- New client hook (mounted on the post-login landing page) that reads local configs via the local adapter (A1 override param), calls the action, then deletes locally the ids that succeeded.
- Idempotency via per-item delete-on-success (repeated logins never duplicate).
- Partial-failure safety: failed items stay in `localStorage` for retry on next login.
- Blocking behavior: the hosting page waits for migration (every item resolved, success or failure) before showing its content.

### Out of Scope

- Any change to `googleLogin`, `signInWithGoogle`, or other already-tested auth code.
- Merge/conflict resolution or dedupe against existing backend configs.
- A "migrated" flag on the domain model or any port/schema change.
- User-visible feedback (no toast/notification on success or failure).

## Capabilities

### New Capabilities

- `timer-configuration-migration`: on-login migration of guest `localStorage` timer configurations to the backend — trigger point, blocking render, idempotency, and partial-failure retention.

### Modified Capabilities

- None. `timer-configuration-persistence` port/adapter requirements are unchanged; this composes them.

## Approach

Exploration Approach 2 (recommended): a dedicated `migrate-timer-configurations` Server Action triggered by a new client hook on the landing page (`/`) that `redirect("/")` already targets. Keeps verified auth untouched, honors A1 (browser adapter via overridable param) and A2 (Server Action call lives in `.hook.ts`), and gets idempotency + partial-failure handling free via per-item delete-on-success.

## Affected Areas

| Area                                                              | Impact       | Description                                                           |
| ----------------------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| `src/infraestructure/actions/migrate-timer-configurations/`       | New          | Migration Server Action + tests                                       |
| `src/ui/components/...landing hook`                               | New          | Client hook: read local, call action, delete succeeded; blocks render |
| `src/app/page.tsx` (or client wrapper)                            | New/Modified | Mount point for the blocking hook                                     |
| local + backend timer-config adapters, `createTimerConfiguration` | Reused       | Composed, not changed                                                 |

## Risks

| Risk                                                                           | Likelihood | Mitigation                                                                                             |
| ------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------ |
| Correlation of local `id` → success is undefined (port `create()` strips `id`) | Med        | Action uses its own request/response shape carrying `id`; NOT a port change. Deferred to `sdd-design`. |
| Missing token / `BACKEND_URL` fail-closed crashes the page                     | Med        | Action treats as "migrate later" (no-op, keep local), never throws to the page                         |
| Blocking render adds perceptible delay on large local sets                     | Low        | Per-item; acceptable per explicit product decision to block                                            |
| No mount point exists yet on `/`                                               | Med        | Add a client wrapper hosting the hook                                                                  |

## Rollback Plan

Revert the migration Server Action, the hook, and the landing-page mount. No schema, port, domain, or auth code changed, so removal is isolated; local configs remain intact in `localStorage`.

## Dependencies

- Issue #19 (closed): port, local + backend adapters, `createTimerConfiguration`/`listTimerConfigurations`.
- Backend `POST /api/v1/timer-configurations` and a valid session token.

## Success Criteria

- [ ] On login, local configs are created on the backend.
- [ ] Successfully migrated local entries are cleared; repeated logins never duplicate.
- [ ] Partial failure leaves unmigrated entries in `localStorage` for next-login retry.
- [ ] No merge/conflict logic; migration is always "create new".
- [ ] Page render blocks until every item resolves; no user-visible feedback.
- [ ] Zero changes to existing auth code/tests.

## Open Question (resolve in design)

The local `id` → success correlation is a **design-level decision**, not a proposal scope choice: define the action's request/response shape (each item tagged with its local `id`) so the hook can delete-on-success. Explicitly deferred to `sdd-design`. Not a port change.

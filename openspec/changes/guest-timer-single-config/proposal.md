# Proposal: Guest Timer Single Config Simplification

Issue: #37 — refactor(timer): simplify guest timer to a single reusable, unnamed configuration
Engram topic: `sdd/guest-timer-single-config/proposal`
Depends on: `sdd/guest-timer-single-config/explore` (Approach 1 selected)

## Context

GitHub Issue #37 asks to simplify the guest timer experience: instead of a
full multi-config CRUD flow with cross-tab migration into the backend on
login, a guest should get one reusable, unnamed timer configuration. The
exploration phase confirmed the current implementation (array storage +
`migrateTimerConfigurations` Server Action + Web Locks coordination) is
over-built for the actual guest use case ("try before you commit").

## Intent

Reduce the guest timer flow to the minimum that serves its real job: let an
unauthenticated visitor configure and run one timer, persisted locally,
without the complexity of multi-record storage, id-based lookup, or
migration into an authenticated account.

Why now: the migration pipeline (Web Locks, batch cap, partial-failure
retry) is dead weight relative to guest intent, and it is the most fragile
part of the timer feature (cross-tab coordination bugs are hard to test and
hard to reason about). Removing it cuts surface area and test burden with no
loss of the feature guests actually use.

Success looks like: a guest can create/edit/run exactly one timer
configuration, no `id`/lookup/not-found paths for guests, no background
migration effect, and the authenticated (logged-in) timer flow is completely
unchanged.

## Scope

### In scope

- Replace guest array storage (`"timer-configurations"` key) with a single
  record under a new key (`"guest-timer"`).
- Guest timer keeps the existing `TimerConfiguration` domain shape,
  including required `name`, populated with a fixed placeholder value
  (`"Mi Timer"`) that the guest never edits directly (Approach 1 from
  exploration — no domain/DTO/Zod schema changes).
- Remove the migration Server Action, the migration-runner hook/component,
  and the guest-by-id lookup hook (see Approach section below).
- Refactor `local-timer-configuration.adapter.ts`, `use-timer-configurations.ts`,
  `timer-active.hook.ts`, `timer-configuration-form.hook.ts`, and
  `app/page.tsx` to the single-record model.
- One-time defensive handling of pre-existing array-shaped localStorage data
  left over from the old format (see Rollback / Migration Risk below).
- Guest-facing name input in the timer configuration form: hidden or
  read-only, since the name is no longer guest-authored.

### Out of scope

- Any change to the authenticated (logged-in) timer flow, its backend API
  contract, or its multi-config CRUD behavior — untouched.
- Making `name` optional/nullable on the `TimerConfiguration` domain model or
  DTOs (Approach 2, rejected in exploration).
- Introducing a separate `GuestTimerConfiguration` domain type (Approach 3,
  rejected in exploration).
- Re-introducing any form of guest-to-account migration. If migration is
  wanted later, it is a new proposal, not a revival of the removed pipeline.
- Route file changes for `app/timers/new/page.tsx`, `app/timers/[id]/edit/page.tsx`,
  `app/timers/[id]/active/page.tsx` — guest behavior at these routes is
  unaffected; only their hook dependencies change internally.

## Approach

Adopt **Approach 1** from the exploration (fixed placeholder name, no schema
changes):

1. **Storage adapter** (`local-timer-configuration.adapter.ts`): drop
   `create/list/getById/update/delete` CRUD surface for guests in favor of a
   `read()` / `write()` pair over a single record at key `"guest-timer"`.
   Reads that find nothing return `null`; writes always overwrite the one
   record with `name: "Mi Timer"` set by the adapter, not the caller.
2. **Remove entirely:**
   - `src/infraestructure/actions/migrate-timer-configurations/` (Server
     Action + Zod validation + batch logic)
   - `src/ui/components/timer-configuration-migration-runner/` (Web Locks
     hook + component + tests)
   - `src/ui/hooks/use-guest-timer-configuration-lookup.ts` (id lookup +
     not-found/redirect + tests)
3. **Refactor:**
   - `use-timer-configurations.ts` — guest branch reads/writes the single
     record instead of managing an array.
   - `timer-active.hook.ts` and `timer-configuration-form.hook.ts` — drop the
     `useGuestTimerConfigurationLookup` call; guest path resolves the single
     stored record directly (or null → fall back to defaults).
   - `app/page.tsx` — remove `TimerConfigurationMigrationRunner` import/JSX.
4. **Migration-state safety net:** on adapter read, if the value at the old
   `"timer-configurations"` key exists (array-shaped, from a pre-change
   guest session), it is not migrated or interpreted — it is simply not read
   by the new adapter (new key = clean slate). No code path attempts to
   parse the old array format going forward.

## Acceptance Criteria

- Guest can create a timer configuration; it is the only one for that
  browser; creating another overwrites, not appends.
- Guest can edit and run their single timer through the existing
  `/timers/new`, `/timers/[id]/edit`, `/timers/[id]/active` routes without
  code changes to those route files.
- Guest timer's `name` is always `"Mi Timer"`; the form does not expose a
  name field to guests (hidden or read-only).
- No network request or Server Action fires on guest login — the migration
  pipeline no longer exists.
- Authenticated user CRUD flow (list, create, update, delete named timers)
  is unaffected — verified by existing authenticated-path tests passing
  unchanged.
- No code path in the new guest adapter reads or writes the old
  `"timer-configurations"` array key.
- `npm run lint`, `npx tsc --noEmit`, and `npm run test` pass.

## Rollback Plan

- The change is additive-key, not destructive: the old `"timer-configurations"`
  key is simply abandoned, never deleted or overwritten by the new code. If
  this change needs to be reverted, restoring the previous adapter,
  migration action, and hooks from git history is sufficient — no data
  recovery step is needed because nothing under the old key was touched.
- Because the new guest key (`"guest-timer"`) is distinct from the old one,
  reverting does not require guests to lose any in-progress single-timer
  state created under the new key; it is simply not read by the reverted
  (old) code, which falls back to its own empty-array default.

## Stale-Array / Storage-Key Migration Risk — Handling

Risk (from exploration): a guest who used the app before this change has an
array under `"timer-configurations"`. After this ships, the new adapter
reads/writes only `"guest-timer"` and never touches the old key.

Decision: **do not migrate the old array.** Rationale (ponytail: avoid
speculative migration code for a guest-only, non-durable, browser-local
value):

- Guest timer data was never guaranteed durable (no backend persistence, no
  cross-device sync) — losing a pre-existing local guest draft is an
  acceptable, low-stakes outcome, not a data-loss incident.
- Writing one-time migration logic to parse the old array, pick "the"
  config to carry forward, and write it under the new key adds exactly the
  kind of complexity this refactor is removing.
- The old key is simply never read again; browsers will eventually evict it
  via normal localStorage lifecycle, or it sits inert and harmless.

If a future PR needs to preserve old guest data, that is a new proposal, not
a hidden requirement of this one.

## Proposal question round

Per SDD process, these should be confirmed with the product owner before
implementation starts (flagged here since this run is non-interactive):

1. Is `"Mi Timer"` acceptable as the permanent guest placeholder name, or
   should it be a different string / derived from timer settings (e.g.
   "Timer de 3 rounds")?
2. Should the guest form fully hide the name field, or show it read-only
   with the placeholder value visible (small UX difference, no code-path
   difference)?
3. Confirming: no migration or warning banner is wanted for guests who had
   multiple saved configs pre-change — losing that local data silently is
   acceptable?
4. Is there any guest analytics/telemetry currently keyed off timer `id`
   that would break silently once guest timers stop having a real
   application-assigned id?

Assumptions used to write this proposal (correct if wrong): placeholder name
`"Mi Timer"`, silent-drop of old array data, no telemetry dependency on
guest timer ids, name field hidden (not read-only) in the guest form.

# Delta for Timer Configuration Screens

(Addendum, per Issue #37 comment dated 2026-07-28: guests get two dedicated routes — `/guest-timer`, `/guest-timer-active`, see the `guest-timer-start-flow` capability — instead of branching inside these shared routes. This delta reverts the MODIFIED requirement below to authenticated-only, undoing the guest branching PR #38's first pass had added to `/timers/new`, `/timers/[id]/edit`, `/timers/[id]/active`.)

## MODIFIED Requirements

### Requirement: Timer configuration form screen (create + edit)

`/timers/new` and `/timers/[id]/edit` MUST share one form screen, for authenticated identities only, collecting `name`, rounds, work duration (minutes + seconds), rest duration (minutes + seconds), and the `warnBeforeEnd`/`bellSound` toggles, combining each minute/second pair into total seconds before persisting. These routes and their hooks (`timer-configuration-form.hook.ts`) MUST NOT contain guest branching (no `isAuthenticated` checks, no guest name-hiding, no guest single-record resolution) — that behavior lives exclusively in the `guest-timer-start-flow` capability's dedicated routes.
(Previously in this same change's first pass: these routes branched on `isAuthenticated` to hide the name field and resolve a single guest record for guests. That branching is reverted by this addendum; it never shipped as a stable behavior worth preserving.)

#### Scenario: Form always collects name

- GIVEN any identity reaching `/timers/new` or `/timers/[id]/edit` (authenticated-only after this change)
- WHEN the form renders
- THEN a `name` input is present and required

#### Scenario: Edit pre-fills via getById

- GIVEN `/timers/[id]/edit` for an authenticated identity
- WHEN the screen loads
- THEN it fetches the record via `getById` and pre-fills all fields, including `name`

#### Scenario: Edit target missing

- GIVEN an id matching no backend record
- WHEN `/timers/[id]/edit` is loaded
- THEN the system calls `notFound()`

#### Scenario: Successful create or update redirects

- GIVEN valid field values
- WHEN "Guardar Timer" is submitted
- THEN the system persists the record via backend CRUD and redirects to `/timers`

#### Scenario: Invalid input surfaces inline, no crash

- GIVEN rounds, or either duration's combined seconds, is non-positive
- WHEN "Guardar Timer" is submitted
- THEN the system shows an inline validation error and MUST NOT navigate away or throw

### Requirement: Active timer screen

`/timers/[id]/active` MUST be authenticated-only, resolving its record via id against the backend adapter. `timer-active.hook.ts` MUST NOT contain guest branching — the guest active-timer screen lives exclusively at `/guest-timer-active` (see `guest-timer-start-flow`).
(Previously in this same change's first pass: this route branched on `isAuthenticated` to resolve a single guest record with no id. That branching is reverted by this addendum.)

#### Scenario: Authenticated active screen resolves by id

- GIVEN an authenticated identity at `/timers/[id]/active`
- WHEN the screen loads
- THEN it fetches the record via `getById` and starts the session from it

#### Scenario: No guest path through this route

- GIVEN a guest visitor
- WHEN they need to run their timer
- THEN they do so through `/guest-timer` and `/guest-timer-active`, never through `/timers/[id]/active`

## Non-Goals

- No change to `TimerConfiguration` domain model, DTOs, or Zod schemas.
- No migration/warning banner for pre-existing `"timer-configurations"` array data — silent drop is accepted per product decision.
- No telemetry/analytics handling changes — none currently depends on guest timer id.
- No guest-facing behavior in `/timers/*` route files or their hooks — guest behavior is fully owned by `guest-timer-start-flow`.

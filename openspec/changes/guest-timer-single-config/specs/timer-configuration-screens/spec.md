# Delta for Timer Configuration Screens

## MODIFIED Requirements

### Requirement: Timer configuration form screen (create + edit)

`/timers/new` and `/timers/[id]/edit` MUST share one form screen collecting rounds, work duration (minutes + seconds), rest duration (minutes + seconds), and the `warnBeforeEnd`/`bellSound` toggles, combining each minute/second pair into total seconds before persisting. For an authenticated identity, the form additionally collects `name`. For a guest identity, the form MUST NOT render a name input at all; the underlying adapter sets `name: "Mi Timer"` unconditionally.
(Previously: form always collected `name`, resolved edit target via id-based `getById`/lookup for both identities.)

#### Scenario: Guest form hides the name field

- GIVEN a guest identity on `/timers/new` or `/timers/[id]/edit`
- WHEN the form renders
- THEN no name input is present, and no placeholder-as-input is shown — the field is absent, not read-only

#### Scenario: Edit pre-fills via getById or single-record read

- GIVEN an authenticated identity in `/timers/[id]/edit`, the screen MUST fetch that record via `getById` and pre-fill all fields
- GIVEN a guest identity in `/timers/[id]/edit`, the screen MUST resolve the single stored record via the guest adapter's `read()`, ignoring the `id` route param, and pre-fill all fields except name

#### Scenario: Edit target missing

- GIVEN an authenticated identity with an id matching no backend record, THEN `notFound()`
- GIVEN a guest identity with no record under `"guest-timer"`, THEN redirect to `/timers`

#### Scenario: Successful create or update redirects

- GIVEN valid field values
- WHEN "Guardar Timer" is submitted
- THEN the system persists the record (authenticated: via backend CRUD; guest: via `write()`) and redirects to `/timers`

#### Scenario: Invalid input surfaces inline, no crash

- GIVEN rounds, or either duration's combined seconds, is non-positive
- WHEN "Guardar Timer" is submitted
- THEN the system shows an inline validation error and MUST NOT navigate away or throw

## Non-Goals

- No change to `TimerConfiguration` domain model, DTOs, or Zod schemas (name stays required, set by the adapter for guests).
- No migration/warning banner for pre-existing `"timer-configurations"` array data — silent drop is accepted per product decision.
- No telemetry/analytics handling changes — none currently depends on guest timer id.
- No change to `app/timers/*` route files beyond internal hook dependency swaps already covered above.

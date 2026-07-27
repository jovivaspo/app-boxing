## NEW CAPABILITY: timer-configuration-screens

### Purpose

User-facing list/create/edit/delete screens, routing shape, and the Server Action surface exposing existing timer use cases to the UI, for both authenticated and guest identities.

### Requirement: Timer Configuration Server Actions

The system MUST expose four Server Actions under `src/infraestructure/actions/` (`list-timer-configuration`, `create-timer-configuration`, `update-timer-configuration`, `delete-timer-configuration`), one file per operation, each delegating to its matching use case, returning a serializable discriminated result, and never throwing across the RSC boundary.

#### Scenario: Authenticated request succeeds

- GIVEN a valid session cookie
- WHEN any of the four actions is invoked with valid input
- THEN it MUST resolve the backend adapter with the session token and return `{ success: true, data }`

#### Scenario: No session — guarded, never reaches backend

- GIVEN no valid session cookie
- WHEN any action is invoked
- THEN it MUST resolve `{ success: false, error }` WITHOUT constructing the backend adapter or issuing any request

#### Scenario: Domain validation failure surfaces as a result, not a throw

- GIVEN authenticated input with non-positive `rounds`, `roundDuration`, or `restDuration`
- WHEN `create` or `update` is invoked
- THEN it MUST catch `InvalidTimerConfiguration` and resolve `{ success: false, error }`

#### Scenario: Target record missing

- GIVEN authenticated input referencing an `id` with no matching backend record
- WHEN `update` or `delete` is invoked
- THEN it MUST catch `timerConfigurationNotFound` and resolve `{ success: false, error }`

### Requirement: Timer list screen (`/timers`)

`/timers` MUST render every saved `TimerConfiguration` for the current identity (authenticated backend records, or guest local records) with its level badge, rounds, and work/rest durations in `m:ss`, and MUST be reachable without authentication.

#### Scenario: Configurations exist

- GIVEN one or more stored configurations
- WHEN `/timers` is requested
- THEN each renders as a card with name, level badge (`calculateTimerLevel`), rounds, and `m:ss` work/rest durations

#### Scenario: No configurations exist

- GIVEN zero stored configurations
- WHEN `/timers` is requested
- THEN it MUST render only the "Nuevo Timer" card plus a short inviting line — no other empty-state UI

#### Scenario: Delete without confirmation

- GIVEN a rendered configuration card
- WHEN its delete action is triggered
- THEN the system MUST delete it immediately, with no confirmation dialog

#### Scenario: Navigation

- GIVEN the list screen
- WHEN the user activates a card's edit action, or the "Nuevo Timer" action
- THEN the system MUST navigate to `/timers/[id]/edit` or `/timers/new` respectively

### Requirement: Timer configuration form screen (create + edit)

`/timers/new` and `/timers/[id]/edit` MUST share one form screen collecting name, rounds, work duration (minutes + seconds), rest duration (minutes + seconds), and the `warnBeforeEnd`/`bellSound` toggles, combining each minute/second pair into total seconds before persisting.

#### Scenario: Edit pre-fills via getById

- GIVEN an existing configuration id in `/timers/[id]/edit`
- WHEN the screen loads
- THEN it MUST fetch that record via `getById` and pre-fill all fields, splitting stored seconds back into minutes+seconds

#### Scenario: Edit target missing

- GIVEN an id with no matching record
- WHEN `/timers/[id]/edit` loads
- THEN it MUST NOT render a pre-filled form (auth identity: `notFound()`; guest identity: redirect to `/timers`)

#### Scenario: Successful create or update redirects

- GIVEN valid field values
- WHEN "Guardar Timer" is submitted
- THEN the system MUST persist the record and redirect to `/timers`

#### Scenario: Invalid input surfaces inline, no crash

- GIVEN rounds, or either duration's combined seconds, is non-positive
- WHEN "Guardar Timer" is submitted
- THEN the system MUST show an inline validation error and MUST NOT navigate away or throw

### Non-Goals

- Bottom navigation (Train/Matches/Stats/Profile) — not implemented, not stubbed.
- Delete confirmation dialog or `alert-dialog` primitive — delete is immediate.
- Timer execution/playback, sound playback, reordering, search, filter, pagination.
- Single combined `m:ss` text input for durations (two numeric inputs instead).
- Post-save inline confirmation while staying on the form (redirects to `/timers` instead).

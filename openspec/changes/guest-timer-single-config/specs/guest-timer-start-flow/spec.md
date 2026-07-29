# Delta for Guest Timer Start Flow

(New capability, per Issue #37 comment dated 2026-07-28: two dedicated guest routes replace the guest branching originally added inside `/timers/*`, reverted in `timer-configuration-screens`.)

## ADDED Requirements

### Requirement: Guest configuration route (`/guest-timer`)

`/guest-timer` MUST render a configuration form collecting rounds, work duration (minutes + seconds), rest duration (minutes + seconds), and the `warnBeforeEnd`/`bellSound` toggles, combining each minute/second pair into total seconds. It MUST NOT render a `name` input — the guest record's name is the fixed placeholder set by the adapter. Its primary action MUST be a **START** button, not a Save button.

#### Scenario: No name field on the guest form

- GIVEN a visitor on `/guest-timer`
- WHEN the form renders
- THEN no `name` input is present

#### Scenario: Primary action is START, not Save

- GIVEN a visitor on `/guest-timer`
- WHEN the form renders
- THEN the primary submit control is labeled/behaves as START, not "Guardar Timer"

### Requirement: START button enabled state

The START button MUST be disabled until both at least one round (`rounds > 0`) and a work/round duration (`roundDuration > 0`, i.e. minutes+seconds combine to a positive value) have been entered. Rest duration MUST NOT be a condition for enabling START.

#### Scenario: Disabled with no input

- GIVEN the guest form is freshly loaded with no values entered
- WHEN the form renders
- THEN the START button is disabled

#### Scenario: Disabled with rounds but no round duration

- GIVEN `rounds > 0` and `roundDuration` combined seconds is `0`
- WHEN the form re-renders
- THEN the START button remains disabled

#### Scenario: Disabled with round duration but no rounds

- GIVEN `rounds = 0` and `roundDuration` combined seconds is `> 0`
- WHEN the form re-renders
- THEN the START button remains disabled

#### Scenario: Enabled once both are present, rest duration irrelevant

- GIVEN `rounds > 0` and `roundDuration` combined seconds is `> 0`, with `restDuration` left at `0`
- WHEN the form re-renders
- THEN the START button becomes enabled

### Requirement: START persists and navigates

Clicking START MUST persist the current form values as the single guest record (via the guest adapter's `write()`, applying the guest-only validation rule from `timer-configuration-persistence`), then navigate to `/guest-timer-active`.

#### Scenario: START persists then navigates

- GIVEN a guest form with `rounds > 0` and `roundDuration > 0`
- WHEN START is clicked
- THEN the configuration is written to the single guest record, and the browser navigates to `/guest-timer-active`

### Requirement: Guest active route (`/guest-timer-active`)

`/guest-timer-active` MUST mirror the authenticated active timer screen's session behavior but resolve its configuration by reading the single guest record (no id, no route param), mirroring `/timers/[id]/active`.

#### Scenario: Active screen reads the single guest record

- GIVEN a guest record exists in localStorage
- WHEN `/guest-timer-active` loads
- THEN it starts the session using that record, with no id resolution involved

### Requirement: Guard redirects when no guest configuration exists

If `/guest-timer-active` is accessed directly with no guest record in localStorage, the route MUST redirect to `/guest-timer`.

#### Scenario: Direct access with no stored config redirects

- GIVEN no record exists under the guest storage key
- WHEN `/guest-timer-active` is loaded directly (e.g. via URL, not via the START flow)
- THEN the system redirects to `/guest-timer`

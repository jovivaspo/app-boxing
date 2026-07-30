# Delta for Timer Configuration Screens

## MODIFIED Requirements

### Requirement: Timer configuration form screen (create + edit)

`/timers/new` and `/timers/[id]/edit` MUST share one form screen collecting
name, rounds, work duration (minutes + seconds), rest duration (minutes +
seconds), and the `warnBeforeEnd`/`bellSound` toggles, combining each
minute/second pair into total seconds before persisting. Each of the 4
duration fields MUST be rendered via `DurationNumberInput`/
`DurationWheelInput`, toggled by the `md:` (768px) Tailwind breakpoint
(`hidden md:block` / `md:hidden`, both variants mounted, no
`matchMedia`/`useMediaQuery` hook), completing the rollout started for
`guest-timer-form`. `TimerConfigurationFormState`'s four duration fields
(`roundMinutes`, `roundSeconds`, `restMinutes`, `restSeconds`) and their
setters (`setRoundMinutes`, `setRoundSeconds`, `setRestMinutes`,
`setRestSeconds`) MUST hold and accept `number`, never `string`; no
`String()`/`Number()` coercion MUST remain in `toFormState()` or
`handleSubmit()`. The `roundDuration > 0` / `restDuration > 0` submit-time
validation and `fieldErrors` display MUST NOT change in behavior.

(Previously: duration fields were raw `<input type="number">` elements bound
to string form state, coerced to `Number()` only at submit.)

#### Scenario: Form loads with numeric state

- GIVEN `/timers/new` or `/timers/[id]/edit`
- WHEN the form mounts
- THEN `roundMinutes`, `roundSeconds`, `restMinutes`, `restSeconds` in
  `TimerConfigurationFormState` MUST each be a `number` (e.g. `0`), never a
  string (e.g. `"0"`)

#### Scenario: Editing a duration field updates numeric state

- GIVEN the form is rendered
- WHEN a duration setter is invoked (e.g. `setRoundMinutes(5)`)
- THEN the corresponding field MUST hold `5` as a `number`, and calling it
  with a string (e.g. `setRoundMinutes("5")`) is an invalid, non-conforming
  usage post-change

#### Scenario: Edit pre-fills via getById

- GIVEN an existing configuration id in `/timers/[id]/edit`
- WHEN the screen loads
- THEN it MUST fetch that record via `getById` and pre-fill all fields,
  splitting stored seconds back into minutes+seconds as numbers, each
  rendered via `DurationNumberInput`/`DurationWheelInput`

#### Scenario: Successful create or update — both durations valid

- GIVEN work duration and rest duration each combine to a total greater
  than 0 seconds
- WHEN "Guardar Timer" is submitted
- THEN the system MUST persist the record and redirect to `/timers`

#### Scenario: Submit rejected — one duration is non-positive

- GIVEN work duration or rest duration combines to `0` total seconds (a
  structurally valid, clamped value the selector components allow)
- WHEN "Guardar Timer" is submitted
- THEN the system MUST populate `fieldErrors` for that duration, MUST NOT
  navigate away, and MUST NOT throw — identical to the pre-change behavior

#### Scenario: Invalid rounds surfaces inline, no crash

- GIVEN rounds is non-positive
- WHEN "Guardar Timer" is submitted
- THEN the system MUST show an inline validation error and MUST NOT
  navigate away or throw

#### Scenario: Responsive toggle — desktop shows number input

- GIVEN a viewport at or above the `md:` (768px) breakpoint
- WHEN the form renders
- THEN each duration field's `DurationNumberInput` MUST be visible and its
  paired `DurationWheelInput` MUST be hidden

#### Scenario: Responsive toggle — mobile shows wheel input

- GIVEN a viewport below the `md:` (768px) breakpoint
- WHEN the form renders
- THEN each duration field's `DurationWheelInput` MUST be visible and its
  paired `DurationNumberInput` MUST be hidden

#### Scenario: No raw number input remains

- GIVEN `timer-configuration-form.tsx`
- WHEN its markup is inspected
- THEN it MUST NOT contain any raw `<input type="number">` for a duration
  field

## Non-Goals

- No change to `roundDuration > 0` / `restDuration > 0` validation semantics
  or `fieldErrors` copy — only the input mechanism and state type change.
- No change to `DurationNumberInput`/`DurationWheelInput` themselves
  (already shipped, #40).
- No change to `guest-timer-form` (already completed, Phase 3).
- No change to backend/persisted `TimerConfiguration` shape — duration
  fields remain seconds (`number`) once combined via `toTotalSeconds`.

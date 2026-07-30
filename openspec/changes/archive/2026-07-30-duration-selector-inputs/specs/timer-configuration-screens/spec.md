# Delta for Timer Configuration Screens

## ADDED Requirements

### Requirement: Duration selector components (`DurationNumberInput` / `DurationWheelInput`)

The system MUST provide `DurationNumberInput` and `DurationWheelInput`, both
implementing `{ value: number; onChange: (value: number) => void; "aria-label": string }`
for a single 0–59 unit, so a form can swap one for the other without
restructuring layout.

`DurationNumberInput` MUST reject non-numeric keystrokes before they reach
state, MUST clamp any resulting value to `[0, 59]`, MUST always render the
value zero-padded to two digits, and MUST reuse `DURATION_INPUT_CLASSNAME`
(`text-primary`/`font-heading`) unchanged.

`DurationWheelInput` MUST render a trigger showing the current zero-padded
value; activating it MUST open a shadcn `Dialog` containing exactly one 0–59
wheel. Confirming MUST call `onChange` with the wheel's position and close
the dialog; cancel, outside-click, or `Escape` MUST close the dialog WITHOUT
calling `onChange`.

Both forms MUST render both components for all 4 duration fields (work/rest
× min/sec) and toggle visibility purely via Tailwind `hidden md:block` /
`md:hidden` at the `md:` (768px) breakpoint — no `matchMedia`/`useMediaQuery`
hook.

#### Scenario: Non-numeric keystroke is rejected

- GIVEN `DurationNumberInput` is focused with value `05`
- WHEN the user types a letter
- THEN the field's value MUST remain `05`, unchanged

#### Scenario: Typed value above 59 is clamped

- GIVEN `DurationNumberInput` is focused
- WHEN the user types a value greater than `59`
- THEN `onChange` MUST fire with `59`, and the display MUST show `59`

#### Scenario: Display is always two digits

- GIVEN `DurationNumberInput` holds value `5`
- WHEN it renders
- THEN it MUST display `05`, never `5`

#### Scenario: Wheel confirm commits the value

- GIVEN `DurationWheelInput`'s dialog is open with the wheel positioned at `23`
- WHEN the user activates Confirm
- THEN `onChange` MUST fire with `23` and the dialog MUST close

#### Scenario: Wheel cancel discards the value

- GIVEN `DurationWheelInput`'s dialog is open with the wheel positioned at `23`, and the field's committed value is `10`
- WHEN the user activates Cancel, clicks outside, or presses `Escape`
- THEN `onChange` MUST NOT fire, and the trigger MUST still show `10`

#### Scenario: Both variants mount simultaneously

- GIVEN a form using these components for a duration field
- WHEN the page renders at any viewport width
- THEN both `DurationNumberInput` and `DurationWheelInput` markup MUST exist in the DOM, with only one visible per the `md:` CSS toggle

### Requirement: Guest timer form duration fields

`guest-timer-form` MUST use `DurationNumberInput`/`DurationWheelInput` for
all 4 duration fields, MUST always initialize every field to `00` on load,
and MUST NOT read any previously stored duration from `localStorage` for
prefill.

#### Scenario: Form always starts blank

- GIVEN a guest previously submitted a session with non-zero durations
- WHEN the guest timer form loads again
- THEN every duration field MUST show `00`, with no localStorage read for prefill

#### Scenario: Round-trip through duration helpers is unaffected

- GIVEN the guest form's minutes/seconds fields hold specific 0–59 values
- WHEN the form submits
- THEN `toTotalSeconds`/`splitDuration` MUST produce the same total-seconds value as the equivalent pre-change raw-number-input form would have

#### Scenario: Form-state duration fields are numbers, not strings

- GIVEN `GuestTimerFormState` and `TimerConfigurationFormState` round/rest minutes+seconds fields
- WHEN a setter (e.g. `setRoundMinutes`) is called or the state is read in a test
- THEN each field MUST hold and accept a `number` (e.g. `setRoundMinutes(1)`, assertions like `toBe(1)`), MUST NOT be typed or asserted as `string` (e.g. `setRoundMinutes("1")`, `toBe("1")` are invalid usages post-change)

## MODIFIED Requirements

### Requirement: Timer configuration form screen (create + edit)

`/timers/new` and `/timers/[id]/edit` MUST share one form screen collecting
name, rounds, work duration (minutes + seconds), rest duration (minutes +
seconds), and the `warnBeforeEnd`/`bellSound` toggles, combining each
minute/second pair into total seconds before persisting. Each of the 4
duration fields MUST be rendered via `DurationNumberInput`/
`DurationWheelInput` (per the new Duration selector components requirement)
instead of a raw `<input type="number">`.

(Previously: duration fields were raw, unconstrained `<input type="number">`
elements with no live validation.)

#### Scenario: Edit pre-fills via getById

- GIVEN an existing configuration id in `/timers/[id]/edit`
- WHEN the screen loads
- THEN it MUST fetch that record via `getById` and pre-fill all fields, splitting stored seconds back into minutes+seconds, each rendered in the new duration components

#### Scenario: Edit target missing

- GIVEN an id with no matching record
- WHEN `/timers/[id]/edit` loads
- THEN it MUST NOT render a pre-filled form (auth identity: `notFound()`; guest identity: redirect to `/timers`)

#### Scenario: Successful create or update redirects

- GIVEN valid field values
- WHEN "Guardar Timer" is submitted
- THEN the system MUST persist the record and redirect to `/timers`

#### Scenario: Component prevents out-of-range keystrokes, submit-time zero check still fires

- GIVEN a work or rest duration field held at `00:00` (a structurally valid, clamped value the components allow)
- WHEN "Guardar Timer" is submitted
- THEN the submit-time `roundDuration > 0` / `restDuration > 0` check in `timer-configuration-form.hook.ts` MUST still reject it and populate `fieldErrors`, MUST NOT navigate away, and MUST NOT throw

#### Scenario: Invalid input surfaces inline, no crash

- GIVEN rounds is non-positive
- WHEN "Guardar Timer" is submitted
- THEN the system MUST show an inline validation error and MUST NOT navigate away or throw

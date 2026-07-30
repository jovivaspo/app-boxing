# Tasks: Constrained duration selector inputs (Issue #39)

## Review Workload Forecast

| Field                        | Value                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estimated changed lines      | ~750-850 (dialog.tsx ~130, duration-number-input ~160, duration-wheel-input ~250, 2 forms + hooks + types + tests ~290)                                                  |
| 800-line budget risk         | Medium-High — estimate straddles the cached 800-line session budget                                                                                                      |
| Chained PRs recommended      | Flagged for orchestrator decision — do not default; risk only, no chain_strategy chosen here                                                                             |
| Suggested split              | Natural cut points: (1) dialog + both new components in isolation, (2) guest-timer-form integration, (3) timer-configuration-form integration — see Suggested Work Units |
| Decision needed before apply | Yes — orchestrator must pick delivery/chain strategy given ask-on-risk policy and Medium-High risk                                                                       |

### Suggested Work Units

| Unit | Goal                                                                                              | Notes                                                                        |
| ---- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | `dialog.tsx` + `DurationNumberInput` + `DurationWheelInput`, fully tested, unused by any form yet | Self-contained, no risk to existing forms; largest single chunk (~540 lines) |
| 2    | `guest-timer-form` integration (swap inputs, remove prefill, number state)                        | Depends on Unit 1; touches 4 files + test                                    |
| 3    | `timer-configuration-form` integration (swap inputs, number state, keep `>0` check)               | Depends on Unit 1; independent of Unit 2; touches 4 files + test             |

## Phase 0: shadcn Dialog primitive

- [x] 0.1 Run `npx shadcn add dialog`. Move the generated file from the flat CLI output location into `src/ui/components/shadcn/dialog.tsx` (per `components.json` aliases.ui convention, matching the existing 5 files: `card.tsx`, `separator.tsx`, `button.tsx`, `input.tsx`, `switch.tsx`). Fix any import paths the move breaks. — supports spec Requirement "Duration selector components" (Dialog usage).

## Phase 1: `DurationNumberInput` — RED → GREEN

- [x] 1.1 (RED) Write `src/ui/components/duration-number-input/__tests__/duration-number-input.hook.test.ts`:
  - `describe("useDurationNumberInput")`
  - `it("should reject a non-numeric keystroke, leaving the value unchanged")`
  - `it("should clamp a typed value above 59 to 59")`
  - `it("should clamp a typed negative-looking value to 0")`
  - `it("should call onChange with the parsed numeric value for a valid keystroke")`
  - `it("should format a single-digit value as zero-padded two digits")` (if padding lives in the hook's derived display; otherwise this scenario moves to a presentational note, no separate hook test — decide during RED based on where padding is implemented)
  - Assertions must use `toBe(59)`/`toBe(0)` etc. (numbers), never string literals — per spec's "Form-state duration fields are numbers, not strings" scenario. — supports spec scenarios "Non-numeric keystroke is rejected", "Typed value above 59 is clamped", "Display is always two digits".
- [x] 1.2 (GREEN) Create `src/ui/components/duration-number-input/duration-number-input.types.ts` exporting `DurationNumberInputProps` (`{ value: number; onChange: (value: number) => void; "aria-label": string }`) and `UseDurationNumberInputResult`.
- [x] 1.3 (GREEN) Create `src/ui/components/duration-number-input/duration-number-input.hook.ts` exporting `useDurationNumberInput({ value, onChange }: DurationNumberInputProps)`, mirroring `rounds-stepper.hook.ts`'s `handleInputChange(raw: string)` pattern: `raw.replace(/\D/g, "")`, `.slice(-2)`, parse, `clamp(0, 59)`, call `onChange`. Run `npm run test` to confirm 1.1 passes.
- [x] 1.4 (GREEN) Create `src/ui/components/duration-number-input/duration-number-input.tsx` — presentational only, `<input type="text" inputMode="numeric">`, zero-padded display (`String(value).padStart(2, "0")`), reusing the unexported `DURATION_INPUT_CLASSNAME` constant moved here from the two form files (module-level `const`, not exported, not in `src/lib`).
- [x] 1.5 Create `src/ui/components/duration-number-input/index.ts` barrel: `export { DurationNumberInput } from "./duration-number-input";`.

## Phase 2: `DurationWheelInput` — RED → GREEN

- [x] 2.1 (RED) Write `src/ui/components/duration-wheel-input/__tests__/duration-wheel-input.hook.test.ts`:
  - `describe("scrollTopToValue")` — pure function, no renderHook needed
    - `it("should map scrollTop 0 to value 0")`
    - `it("should round a partial scroll position to the nearest value")`
    - `it("should clamp an out-of-range scrollTop to 59")`
  - `describe("valueToScrollTop")`
    - `it("should be the inverse of scrollTopToValue for an exact value")`
  - `describe("useDurationWheelInput")`
    - `it("should seed draft from value when the dialog opens")`
    - `it("should call onChange with the draft value and close on confirm")`
    - `it("should not call onChange when cancelled")`
    - `it("should not call onChange when closed via outside-click/Escape (onOpenChange(false))")`
  - supports spec scenarios "Wheel confirm commits the value", "Wheel cancel discards the value".
- [x] 2.2 (GREEN) Create `src/ui/components/duration-wheel-input/duration-wheel-input.types.ts` exporting `DurationWheelInputProps` (same `{ value, onChange, "aria-label" }` contract) and `UseDurationWheelInputResult`.
- [x] 2.3 (GREEN) Create `src/ui/components/duration-wheel-input/duration-wheel-input.hook.ts` exporting standalone pure functions `scrollTopToValue(scrollTop: number, itemHeight: number): number` and `valueToScrollTop(value: number, itemHeight: number): number`, plus `useDurationWheelInput({ value, onChange })` owning local `draft` state (seeded from `value` on open), `handleScroll`, `handleConfirm` (calls `onChange(draft)`, closes), `handleOpenChange` (Cancel/outside-click/Escape close without committing). Run `npm run test` to confirm 2.1 passes.
- [x] 2.4 (GREEN) Create `src/ui/components/duration-wheel-input/duration-wheel-input.tsx` — presentational only: trigger `<button>` showing zero-padded `value`, shadcn `Dialog` containing a `scroll-snap-type: y mandatory` list of 0-59 items bound to `onScroll`, Confirm/Cancel buttons.
- [x] 2.5 Create `src/ui/components/duration-wheel-input/index.ts` barrel: `export { DurationWheelInput } from "./duration-wheel-input";`.

## Phase 3: Integrate into `guest-timer-form`

- [ ] 3.1 (RED) Update `src/ui/components/guest-timer-form/__tests__/guest-timer-form.hook.test.ts`: change all `roundMinutes`/`roundSeconds`/`restMinutes`/`restSeconds` literals and `setRoundMinutes`/etc. call arguments/assertions from strings (`"1"`, `toBe("1")`) to numbers (`1`, `toBe(1)`). Remove/replace the prefill-from-localStorage test with a test asserting the form always initializes to `0` for all 4 duration fields regardless of `localAdapter.read()` — per spec scenario "Form always starts blank". Run `npm run test`; confirm these specific tests fail against current string-typed implementation (RED).
- [ ] 3.2 (GREEN) Update `src/ui/components/guest-timer-form/guest-timer-form.types.ts`: `roundMinutes`/`roundSeconds`/`restMinutes`/`restSeconds` fields `string` → `number`; corresponding setters `(value: string) => void` → `(value: number) => void`.
- [ ] 3.3 (GREEN) Update `src/ui/components/guest-timer-form/guest-timer-form.hook.ts`: `EMPTY_FORM` duration fields become `0`; remove the prefill `useEffect` (lines ~57-68) and its now-dead `toFormState` prefill call path (keep `toFormState` only if still referenced elsewhere — otherwise delete it entirely along with the `localAdapter.read()` call); remove `Number(form.roundMinutes)`-style coercions in `toTotalSeconds` calls, since state is already numeric. Run `npm run test` to confirm 3.1 passes.
- [ ] 3.4 (GREEN) Update `src/ui/components/guest-timer-form/guest-timer-form.tsx`: remove `DURATION_INPUT_CLASSNAME` (now owned by `DurationNumberInput`); replace all 4 raw `<input type="number">` with paired `DurationNumberInput`/`DurationWheelInput` per field, each toggled `hidden md:block`/`md:hidden` at the `md:` breakpoint — per spec scenario "Both variants mount simultaneously".

## Phase 4: Integrate into `timer-configuration-form`

- [ ] 4.1 (RED) Update `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts`: change duration-field literals/assertions from strings to numbers, same pattern as 3.1. Keep/extend the existing `roundDuration <= 0` / `restDuration <= 0` submit-time `fieldErrors` test(s) unchanged in intent, updated only for numeric setter calls — per spec scenario "Component prevents out-of-range keystrokes, submit-time zero check still fires". Run `npm run test`; confirm RED against current string-typed implementation.
- [ ] 4.2 (GREEN) Update `src/ui/components/timer-configuration-form/timer-configuration-form.types.ts`: same `string` → `number` field/setter change as 3.2, including `toFormState`'s return shape (edit-mode hydration from `initialConfiguration` stays, now returns numbers via `splitDuration`, no `String()` wrapping).
- [ ] 4.3 (GREEN) Update `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts`: remove `Number()`/`String()` coercions around `toTotalSeconds`/`toFormState`. Leave the `roundDuration <= 0`/`restDuration <= 0` `fieldErrors` check and `ERROR_CODE_COPY` logic untouched — confirmed out of scope per design decision 7. Run `npm run test` to confirm 4.1 passes.
- [ ] 4.4 (GREEN) Update `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`: remove local `DURATION_INPUT_CLASSNAME`; replace all 4 raw `<input type="number">` with paired `DurationNumberInput`/`DurationWheelInput` per field, same `hidden md:block`/`md:hidden` toggle as guest form; keep the existing `fieldErrors.roundDuration`/`restDuration` inline error `<p>` blocks unchanged.

## Phase 5: Verification

- [ ] 5.1 Run `npm run lint` — no violations across all new and modified files.
- [ ] 5.2 Run `npx tsc --noEmit` — no type errors (confirms `string` → `number` cascade is complete in both forms).
- [ ] 5.3 Run `npm run test` — full suite green, including new `duration-number-input.hook.test.ts`, `duration-wheel-input.hook.test.ts`, and updated `guest-timer-form.hook.test.ts`/`timer-configuration-form.hook.test.ts`.
- [ ] 5.4 Manually confirm no remaining `<input type="number">` for a duration field in either form file (grep for `type="number"` in both `.tsx` files — `RoundsStepper`'s internal input, if any, is out of scope and untouched).
- [ ] 5.5 Confirm `guest-timer-form.hook.ts` no longer imports/calls `localAdapter.read()` for prefill (write-on-submit still calls `localAdapter.write()` — unaffected).

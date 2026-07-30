# Proposal: Timer-configuration-form duration selector integration (Issue #43, Phase 4)

## Intent

`timer-configuration-form` still holds `roundMinutes`/`roundSeconds`/`restMinutes`/`restSeconds` as
raw strings, coerced to numbers only at submit time via `Number(...)`, and renders them with a
local `<input type="number">` that duplicates `DurationNumberInput`'s styling. `DurationWheelInput`
and `DurationNumberInput` already exist and already power `guest-timer-form` (Phase 3, issue #43).
This phase finishes the rollout: make `timer-configuration-form`'s state numeric end-to-end and
swap its 4 raw inputs for the shared components, closing out issue #43.

## Scope

### In Scope

- Tasks 4.1–4.4: hook test (RED) → types → hook logic → presentational component, all string→number
  duration-field cascade, mirroring the Phase 3 `guest-timer-form` pattern exactly.
- Wiring `DurationNumberInput` (desktop) / `DurationWheelInput` (mobile) into
  `timer-configuration-form.tsx`, replacing the 4 raw `<input type="number">` fields and the local
  `DURATION_INPUT_CLASSNAME`.

### Out of Scope

- Validation logic (`roundDuration <= 0` / `restDuration <= 0` checks, `fieldErrors`, error copy) —
  preserved exactly, no behavior change.
- `DurationNumberInput` / `DurationWheelInput` themselves — already shipped (#40), consumed as-is.
- Backend/API/persisted `TimerConfiguration` shape — total-seconds persistence format is untouched;
  this is form-state only.
- Any other form (`guest-timer-form` already done in Phase 3).

## Proposal question round

Exploration marked this as an unambiguous mirror of a proven pattern, but flagging the product
assumptions this proposal locks in, in case any should differ:

1. Should the authenticated form's `>0` validation for both `roundDuration` and `restDuration`
   stay symmetric (both required), even though the sibling guest form intentionally only requires
   `roundDuration > 0`? **Assumption: yes, no change** — this phase does not touch validation.
2. Is silent keystroke clamping (0–59, already shipped in `DurationNumberInput`/`DurationWheelInput`)
   sufficient here too, with no new UX cue when a value is clamped? **Assumption: yes**, matches
   Phase 3 exactly.

If either assumption is wrong, correct it before apply — both are cheap to change now, load-bearing
once tasks/design are written.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `timer-configuration-screens` — "Timer configuration form screen" requirement's duration-field
  input mechanism finishes the transition to the constrained selector components (already partially
  captured by the prior `duration-selector-inputs` change); underlying validation scenarios are
  unchanged.

## Approach

Type cascade, string → number, same order as Phase 3:

1. **4.1 (RED)** — update hook test assertions/setters from string literals (`"1"`) to numbers (`1`).
2. **4.2 (GREEN)** — `TimerConfigurationFormState` and setter signatures: `string` → `number`.
3. **4.3 (GREEN)** — `EMPTY_FORM` defaults to `0`; `toFormState()` drops `String()` wrapping;
   `handleSubmit()` drops `Number()` coercion. `>0` validation untouched.
4. **4.4 (GREEN)** — swap raw inputs for paired `DurationNumberInput`/`DurationWheelInput`, toggled
   via `hidden md:block` / `md:hidden`, matching Phase 3's markup exactly.

## Affected Areas

| Area                                                                                         | Impact   | Description                                                  |
| -------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| `src/ui/components/timer-configuration-form/timer-configuration-form.types.ts`               | Modified | Duration fields/setters `string` → `number`                  |
| `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts`                | Modified | Remove `String()`/`Number()` coercions; validation preserved |
| `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`                    | Modified | Raw inputs → `DurationNumberInput`/`DurationWheelInput`      |
| `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts` | Modified | String assertions → number assertions                        |

## Risks

| Risk                                                                          | Likelihood | Mitigation                                                        |
| ----------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| Raw `type="number"` input left in place, causing duplicate/conflicting fields | Low        | Verify phase greps for `type="number"` in the `.tsx` file         |
| String leaking into `toTotalSeconds()` via a missed coercion site             | Low        | TypeScript strict mode + hook tests catch it at compile/test time |

## Rollback Plan

Revert the 4 touched files (`types.ts`, `hook.ts`, `.tsx`, hook test). No other module imports these
duration fields directly, so the revert is isolated and mirrors Phase 3's rollback shape.

## Dependencies

- `DurationNumberInput` / `DurationWheelInput` (already shipped, #40).
- Phase 3 (`guest-timer-form` integration) as the proven reference pattern — already complete.

## Success Criteria

- [x] `timer-configuration-form`'s duration fields are `number` end-to-end, state through UI.
- [x] `DurationNumberInput`/`DurationWheelInput` responsive toggle (`hidden md:block` / `md:hidden`)
      works, matching Phase 3.
- [x] `roundDuration > 0` / `restDuration > 0` validation and `fieldErrors` display unchanged.
- [x] No raw `<input type="number">` remains in `timer-configuration-form.tsx`.
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run test` all pass.

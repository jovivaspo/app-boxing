# Design: Timer-configuration-form duration selector integration (Issue #43, Phase 4)

## Technical Approach

Mirror Phase 3 (`guest-timer-form`, already shipped) exactly: convert the 4 duration fields (`roundMinutes/roundSeconds/restMinutes/restSeconds`) from `string` to `number` end-to-end in `timer-configuration-form`, then swap the raw `<input type="number">` pair for `DurationNumberInput` (desktop, `hidden md:block`) / `DurationWheelInput` (mobile, `md:hidden`). No new components, no port/domain changes. `name`, `rounds`, `fieldErrors`, `formError` stay untouched — this phase touches only the 4 duration fields and their setters.

## Architecture Decisions

| Decision                       | Choice                                                                                                                                                                                                     | Rejected                                                     | Rationale                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Type cascade shape             | `string` → `number` fully in hook state/setters (identical to `GuestTimerFormState`)                                                                                                                       | Coerce only at render (keep string state, `Number()` in JSX) | Guest form proves the pattern; keeps hook the single coercion boundary, no `Number()`/`String()` scattered in `.tsx`                |
| Validation placement           | Keep `roundDuration <= 0` / `restDuration <= 0` checks in `handleSubmit`, computed via `toTotalSeconds(form.roundMinutes, form.roundSeconds)` — no `Number()` wrap needed since fields are already numbers | Move validation to setters (clamp on change)                 | Out of scope per proposal; DurationNumberInput/Wheel already do keystroke clamping (0–59) at the component layer                    |
| `toFormState()` numeric fields | Drop `String(round.minutes)` → use `round.minutes` directly                                                                                                                                                | Keep `String()` and coerce in JSX                            | Symmetric with guest form's un-annotated numeric assignment; `splitDuration()` already returns `{minutes: number, seconds: number}` |
| Component composition          | Same responsive-toggle pair-per-field markup as `guest-timer-form.tsx` (2 wrapper `div`s per field, one `hidden md:block`, one `md:hidden`)                                                                | Single component with internal media query                   | Consistency — Phase 3 established this as the project pattern for duration fields                                                   |

## Data Flow

    TimerConfigurationFormState.roundMinutes: number
        │ setRoundMinutes(value: number)
        ▼
    useState<TimerConfigurationFormState> (hook, unchanged shape otherwise)
        │ handleSubmit: toTotalSeconds(form.roundMinutes, form.roundSeconds) → roundDuration: number
        ▼
    validation (roundDuration <= 0 ? fieldErrors.roundDuration : ok) — UNCHANGED
        │
        ▼
    ops.create/update(candidate) — unchanged shape, TimerConfiguration.roundDuration already number

`toFormState()` (edit-mode hydration): `splitDuration(config.roundDuration)` → `{minutes, seconds}` numbers → assigned directly, no `String()`.

## File Changes

| File                                                                                         | Action | Description                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/components/timer-configuration-form/timer-configuration-form.types.ts`               | Modify | `roundMinutes/roundSeconds/restMinutes/restSeconds: string` → `number` in `TimerConfigurationFormState`; matching setter signatures `(value: string) => void` → `(value: number) => void` in `UseTimerConfigurationFormResult`                                                                                                                                               |
| `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts`                | Modify | `EMPTY_FORM` duration defaults `""` → `0`; `toFormState()` drops `String()` wraps; `handleSubmit()` drops `Number()` wraps around `form.*Minutes/*Seconds`; validation logic (`<= 0` checks) untouched                                                                                                                                                                       |
| `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`                    | Modify | Replace 4 `<input type="number" ...>` + `DURATION_INPUT_CLASSNAME` const with paired `DurationNumberInput`/`DurationWheelInput` per field (8 wrapper divs total), same markup shape as `guest-timer-form.tsx` lines 47–79/86–118; import both from `@/ui/components/duration-number-input` / `@/ui/components/duration-wheel-input`; remove local `DURATION_INPUT_CLASSNAME` |
| `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts` | Modify | Setter call sites `setRoundMinutes("1")` → `setRoundMinutes(1)` (lines 65–68, 104–105, 122–123 and any `roundMinutes: "…"` object literals in assertions/builders); no new test cases, no assertion-logic changes                                                                                                                                                            |

## Interfaces / Contracts

```typescript
// timer-configuration-form.types.ts (delta only)
export interface TimerConfigurationFormState {
  name: string;
  rounds: number;
  roundMinutes: number; // was string
  roundSeconds: number; // was string
  restMinutes: number; // was string
  restSeconds: number; // was string
  warnBeforeEnd: boolean;
  bellSound: boolean;
}

export interface UseTimerConfigurationFormResult {
  // ...
  setRoundMinutes: (value: number) => void; // was (value: string) => void
  setRoundSeconds: (value: number) => void;
  setRestMinutes: (value: number) => void;
  setRestSeconds: (value: number) => void;
  // ...
}
```

`DurationNumberInputProps`/`DurationWheelInputProps` (already shipped, unchanged): `{ value: number; onChange: (value: number) => void; "aria-label": string }` — direct fit, no adapter needed since setters are now `(value: number) => void`.

## Testing Strategy

| Layer         | What to Test                                                                                                                                                                        | Approach                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unit (hook)   | Existing RED-first assertions updated to numeric setter args/state; validation (`roundDuration <= 0`/`restDuration <= 0` → `fieldErrors`) re-verified unchanged with numeric inputs | Update `timer-configuration-form.hook.test.ts` per task 4.1 (RED), confirm GREEN after 4.2/4.3 |
| Static        | No raw `<input type="number">` remains; TS strict catches any missed `String()`/`Number()`                                                                                          | `npx tsc --noEmit`, grep verify in sdd-verify phase                                            |
| Manual/visual | Responsive toggle (`hidden md:block` / `md:hidden`) renders correctly                                                                                                               | Not automated — matches Phase 3 precedent (DurationWheelInput has no covering tests today)     |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. `TimerConfiguration` domain shape (`roundDuration`/`restDuration` as `number` seconds) is unchanged; only the form's intermediate UI state type changes. Revert is isolated to the 4 touched files (per proposal rollback plan).

## Open Questions

None — proposal's 2 assumptions (symmetric > 0 validation, no new clamp UX cue) both carry through unchanged; low cost to correct in apply if wrong.

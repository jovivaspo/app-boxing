## Exploration: Timer-Configuration-Form Duration Selector Integration (Phase 4)

### Current State

**Timer-configuration-form** currently uses **string-based duration fields**:

- `roundMinutes`, `roundSeconds`, `restMinutes`, `restSeconds` are all `string` in `TimerConfigurationFormState`
- Setters: `setRoundMinutes(value: string) => void` (and similarly for seconds/rest fields)
- Form initialization: `EMPTY_FORM` uses empty strings `""` for all duration fields
- Edit-mode prefill: `toFormState()` calls `splitDuration()` then wraps results in `String()` (e.g., `String(round.minutes)`)
- Submit-time processing: `handleSubmit()` coerces strings to numbers with `Number(form.roundMinutes)` before passing to `toTotalSeconds()`
- **Validation preserved:** `roundDuration <= 0` and `restDuration <= 0` checks fire after conversion, with error messages stored in `fieldErrors`

**Presentational layer** (`timer-configuration-form.tsx`):

- Uses raw `<input type="number">` for all 4 duration fields (lines 71–90, 103–122)
- Local `DURATION_INPUT_CLASSNAME` constant (replicates code from `duration-number-input`)
- No DurationNumberInput or DurationWheelInput usage yet

**Related components already complete:**

- `DurationNumberInput` (`src/ui/components/duration-number-input/`): accepts `{ value: number, onChange: (value: number) => void, "aria-label": string }`
- `DurationWheelInput` (`src/ui/components/duration-wheel-input/`): same contract, dialog-based wheel picker
- Both components handle 0–59 clamping, zero-padding, and keystroke filtering
- Guest-timer-form integration (phase 3) already completed—serves as reference pattern

### Affected Areas

| File                                                                                         | Why Affected                                | Scope                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/ui/components/timer-configuration-form/timer-configuration-form.types.ts`               | Type definitions for form state and setters | Change duration fields `string` → `number`; update setter signatures                                                                                                           |
| `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts`                | Form logic, state management, validation    | Remove `Number()` coercions; update `toFormState()` to return numbers; preserve `>0` validation logic                                                                          |
| `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`                    | Presentational: form fields and layout      | Replace raw `<input type="number">` with paired `DurationNumberInput`/`DurationWheelInput`; remove local `DURATION_INPUT_CLASSNAME`; add `hidden md:block`/`md:hidden` toggles |
| `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts` | Hook tests                                  | Update duration field assertions from strings (`"1"`, `toBe("1")`) to numbers (`1`, `toBe(1)`); extend `>0` check test to use numeric setter calls; no new scenarios           |

### Approach: Type Cascade (string → number)

**Single approach: complete type cascade from state through logic to UI components.**

Rationale:

- Validation must be numeric (state already becomes numbers at submit time)
- Moving conversion to state layer earlier eliminates runtime coercions in hook
- DurationNumberInput/DurationWheelInput already require numeric values
- Mirrors phase 3 guest-timer-form pattern exactly (proven, tested)
- No alternative approaches needed—this is the defined spec requirement

**Steps (in order, matching tasks 4.1–4.4):**

1. **4.1 (RED)** — Update hook test: change all duration-field test assertions from strings to numbers
   - Line 48: `toBe("1")` → `toBe(1)`
   - Line 49: `toBe("30")` → `toBe(30)`, etc.
   - Line 65–68: setter calls use numbers (`setRoundMinutes(1)` not `setRoundMinutes("1")`)
   - Preserve all three existing test cases: prefill, combine, validation
   - Preserve `>0` check test (lines 79–91)

2. **4.2 (GREEN)** — Update types: duration fields and setters
   - `TimerConfigurationFormState`: `roundMinutes: string` → `roundMinutes: number` (and similarly for `roundSeconds`, `restMinutes`, `restSeconds`)
   - `UseTimerConfigurationFormResult`: setters `(value: string) => void` → `(value: number) => void` for all 4 duration fields
   - `toFormState()` return type already correct (implicit from changes in 4.3)

3. **4.3 (GREEN)** — Update hook logic
   - `EMPTY_FORM`: `roundMinutes: ""` → `roundMinutes: 0` (and all 4 duration fields)
   - `toFormState()`: Remove `String()` wrapping—return `round.minutes` and `round.seconds` directly as numbers
   - `handleSubmit()`: Remove `Number()` coercions—pass `form.roundMinutes` directly to `toTotalSeconds()` (already numeric)
   - **Preserve unchanged**: `roundDuration <= 0` validation check, error messages, `ERROR_CODE_COPY`, submit flow

4. **4.4 (GREEN)** — Update presentational component
   - Remove local `DURATION_INPUT_CLASSNAME` (now owned by `DurationNumberInput`)
   - Import `DurationNumberInput` and `DurationWheelInput`
   - Replace each raw `<input type="number">` (4 total) with dual-input block:
     ```tsx
     <div className="hidden md:block">
       <DurationNumberInput value={form.roundMinutes} onChange={setRoundMinutes} aria-label="..." />
     </div>
     <div className="md:hidden">
       <DurationWheelInput value={form.roundMinutes} onChange={setRoundMinutes} aria-label="..." />
     </div>
     ```
   - Keep existing `fieldErrors.roundDuration` / `restDuration` error `<p>` blocks (unchanged)
   - Update `aria-label` values to match current labels

### Validation Logic (Preserved Exactly)

**No changes to validation:**

- Check timing: submit-time only (after combining minutes/seconds into total seconds)
- `roundDuration <= 0`: "La duración de trabajo debe ser mayor a 0."
- `restDuration <= 0`: "La duración de descanso debe ser mayor a 0."
- Errors block submission and set `fieldErrors[field]`
- DurationNumberInput/DurationWheelInput _prevent_ invalid keystrokes client-side (clamping 0–59), but validation still runs at submit to catch zero combined durations

### Test Changes Summary

**What changes in hook test:**

- All string literals become numbers: `"1"` → `1`, `"30"` → `30`, `"0"` → `0`
- All assertions become number assertions: `toBe("1")` → `toBe(1)`
- Setter calls use numbers: `setRoundMinutes(1)` not `setRoundMinutes("1")`

**What stays unchanged:**

- Three core test scenarios: prefill, combine, validation—all remain
- Validation test (lines 79–91) confirms `fieldErrors.roundDuration` and `fieldErrors.restDuration` are set when durations are 0
- Error code mapping test (lines 114–131) unchanged

### Constraints & Edge Cases

1. **Edit mode (prefill from initialConfiguration)**: `toFormState()` must return numbers via `splitDuration()` directly, no `String()` wrapping
2. **Component mount**: Form state initializes to `0` for all duration fields (via `EMPTY_FORM`), not empty strings
3. **Dual-input rendering**: Both `DurationNumberInput` and `DurationWheelInput` must mount simultaneously, toggled with `hidden md:block` / `md:hidden` (per spec, both variants always present)
4. **Clamping vs. validation**: DurationNumberInput/DurationWheelInput clamp keystrokes to 0–59; submit-time validation checks if combined duration is > 0 (separate concern)
5. **Type safety**: Once duration fields are numeric in state, all coercions in hook logic can be removed—`toTotalSeconds()` already handles `NaN` safely via `Number.isNaN()`

### Risks

- **None identified for type cascade itself.** The migration is mechanical (string → number), follows the proven guest-timer-form pattern, and preserves all existing validation logic.
- **Implementation risk (medium):** If raw `<input type="number">` inputs are missed in the `.tsx` file, form will have duplicate/conflicting inputs. Mitigation: grep for `type="number"` in `timer-configuration-form.tsx` during verification (phase 5).
- **Edit-mode edge case (low):** If `toFormState()` accidentally passes strings to combined `toTotalSeconds()`, coercion will hide the bug at runtime. Mitigation: tests in 4.1 use numeric setters, type checker in CI enforces `number` type.

### Ready for Proposal

**Yes.** Scope is clear, approach is proven (guest-timer-form precedent), and validation logic is preserved. Tasks 4.1–4.4 are well-defined with specific line ranges and no ambiguity. ~130 lines estimated (types + hook + component + tests) aligns with phase scope.

**Handoff to orchestrator:** Phase 4 is ready for task specification and apply phase.

# Exploration: duration-selector-inputs (Issue #39)

## Current State

- `src/ui/components/guest-timer-form/guest-timer-form.tsx` (lines 49–95): 4 free `<input type="number">` fields for work/rest × minutes/seconds, no max constraint, no keystroke validation, no visual feedback
- `src/ui/components/timer-configuration-form/timer-configuration-form.tsx` (lines 71–121): identical 4 fields, duplicated markup, same constraints
- Validation deferred to submit time only: `timer-configuration-form.hook.ts` (lines 115–122) validates `roundDuration > 0` and `restDuration > 0` in `handleSubmit()`, shows `fieldErrors.roundDuration`/`restDuration` only after failed submit attempt
- `guest-timer-form.hook.ts` (lines 57–68): prefill logic loads previous session config from localStorage via `localAdapter.read()`, then calls `setForm(toFormState(existing))` — directly contradicts issue requirement "Valor por defecto SIEMPRE 00:00"
- Duration utilities: `src/lib/duration.ts` — `splitDuration()`, `toTotalSeconds()`, `formatDuration()` already exist, work correctly, no clamp logic needed (caller's responsibility)
- shadcn Dialog component NOT installed; `radix-ui@1.6.1` available; Dialog will be added via `npx shadcn add dialog`
- Responsive pattern used elsewhere: `md:` breakpoint (768px default) seen in `timer-configuration-list.tsx` line 24 (`grid-cols-1 gap-6 md:grid-cols-2`)
- Component folder structure already established: `src/ui/components/{kebab-case}/{component}.tsx` + `{component}.hook.ts` + `{component}.types.ts` + `index.ts` + `__tests__/` (test only hook, not presentational component)

## Affected Areas

- `src/ui/components/guest-timer-form/guest-timer-form.tsx` (lines 49–95) — replace 4 inputs with new components
- `src/ui/components/guest-timer-form/guest-timer-form.hook.ts` (lines 57–68 prefill logic must be removed; lines 74–89 setters continue unchanged)
- `src/ui/components/timer-configuration-form/timer-configuration-form.tsx` (lines 71–121) — replace 4 inputs with new components
- `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts` (lines 115–122 validation logic, fieldErrors display may be simplified post-component)
- **New**: `src/ui/components/duration-number-input/` — desktop component (0–59, padded, keystroke rejection, no modal)
- **New**: `src/ui/components/duration-wheel-input/` — mobile component (Dialog + custom wheel picker for 0–59)
- `src/lib/duration.ts` — no changes required; utilities already compatible

## Approaches

### Wheel Picker Implementation Options

| Approach                                                    | Pros                                                                                                 | Cons                                                                                             | Effort           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------- |
| **Single 0–59 wheel (rotary picker)**                       | Simpler to build, single visual element, works for both min/sec with instance per field              | Requires two pickers in modal (side-by-side or stacked); less discoverable than time-input shape | ~2–3 days        |
| **Dual wheels (min 0–59, sec 0–59, iOS time-picker style)** | Familiar pattern, compact, classic time-picker UX, matches native `<input type="time">` mental model | More complex rotation/gesture logic, must sync two wheels, larger modal footprint                | ~3–4 days        |
| **Stepper buttons (like RoundsStepper)**                    | Reuses existing Stepper pattern, very simple                                                         | Tedious for large ranges (60 values, many clicks to reach 59); poor UX for duration selection    | ~1 day (poor UX) |

Issue inspiration (https://elcssar.com/html5/input-type-time-selector) hints at dual-wheel pattern; issue explicitly rejects external libs and native `<input type="time">` (Firefox text-color limitation). Recommendation: dual-wheel if polish matters; single-wheel with separate min/sec invocations if speed prioritized. Left open for proposal phase.

## Architecture Notes

- Both new components are UI layer, hook-based per AGENTS.md (only hook tested, not presentational component)
- No domain/application layer changes; validation moves from application-hook submit-time to UI-component keystroke-time
- `DurationNumberInput`: input element with keystroke filtering (reject non-numeric), auto-clamp to 0–59, pad to 2 digits, reuse DURATION_INPUT_CLASSNAME styling
- `DurationWheelInput`: Dialog modal with custom wheel picker(s), accept on confirm, cancel/outside-click to dismiss
- Both forms need responsive rendering: desktop (md breakpoint and above) → DurationNumberInput; mobile/tablet (below md) → DurationWheelInput
- Prefill removal (guest-timer-form) is deliberate UX change: loses "return and resume editing" behavior; users always start with 00:00

## Open Design Questions

1. **Exact breakpoint for desktop ↔ mobile switch?** Issue asks for "desktop ↔ tablet/mobile" without specifying px value. Recommend `md:` (768px Tailwind default) for consistency with codebase convention; must be confirmed in proposal/design phase.

2. **Does `fieldErrors.roundDuration`/`restDuration` display remain necessary post-component?** Currently shown in `timer-configuration-form.tsx` after submit fails (lines 91–95, 123–127). New DurationNumberInput can reject/clamp pre-submission. Open: does component own all error state, or do forms still show post-submit errors? Must be decided before implementation to avoid rework of error UX.

3. **Prefill removal confirmation** — Issue explicitly requires always-blank form ("Valor por defecto SIEMPRE 00:00"), which removes the localStorage-load logic. Confirm this intent before implementation.

## Risks

- Prefill removal breaks existing "return and resume" UX pattern on guest-timer page — verify product intent
- Wheel picker complexity (single vs. dual) must be locked down before tasks/implementation
- `fieldErrors` lifecycle needs clarification to avoid error-display rework mid-implementation
- `npx shadcn add dialog` must land correctly in @/ui/components/shadcn/ per components.json alias; verify after installation

## Ready for Proposal

Yes — codebase investigation complete, exact file locations and line ranges confirmed, two viable wheel-picker approaches documented with effort estimates, three open design questions identified and ready for proposal/design phase to settle.

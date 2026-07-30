# Proposal: Constrained duration selector inputs — desktop number input + mobile wheel picker (Issue #39)

## Intent

Work/rest duration fields (minutes + seconds, ×2 groups, in both `guest-timer-form` and
`timer-configuration-form`) are today four identical free-form `<input type="number">` elements
with no upper bound and no live feedback — a user can type `99`, a negative number, or leave a
field empty, and only discover it's wrong at submit time (and only in the authenticated form;
the guest form has no post-input validation at all). This proposal replaces that duplicated,
unconstrained markup with two new reusable components — `DurationNumberInput` (desktop) and
`DurationWheelInput` (mobile/tablet) — that make an out-of-range value structurally impossible to
enter, eliminate the duplication between the two forms, and match the two device-appropriate
interaction patterns the issue asks for (typed input on desktop, wheel picker on touch).

## Scope

### In Scope

- **New** `src/ui/components/duration-number-input/`: desktop text input, single 0–59 value,
  keystroke-level rejection of non-numeric characters and out-of-range values, zero-padded
  display (`"5"` → `"05"`).
- **New** `src/ui/components/duration-wheel-input/`: mobile/tablet trigger button + shadcn
  `Dialog` modal containing one custom 0–59 wheel picker, confirm/cancel semantics.
- `npx shadcn add dialog` (only new install — a `radix-ui` primitive already in the dependency
  family, lands in `src/ui/components/shadcn/` per `components.json`).
- `guest-timer-form.tsx` / `timer-configuration-form.tsx`: replace all 4 raw `<input
type="number">` fields each with the new components, both variants rendered and toggled by
  Tailwind breakpoint (no JS media-query hook).
- `guest-timer-form.hook.ts`: remove the localStorage prefill `useEffect` (~lines 57–68) — the
  issue requires the form always start blank (`00:00`).
- `timer-configuration-form.hook.ts`: unchanged in shape — the existing submit-time `>0` check
  and `fieldErrors.roundDuration`/`restDuration` display stay (see Approach § fieldErrors below).

### Out of Scope

- `src/lib/duration.ts` — reused as-is (`splitDuration`, `toTotalSeconds`), no changes needed.
- `RoundsStepper`, `warnBeforeEnd`/`bellSound` switches, the `name` field — untouched.
- Domain/application layers, `TimerConfiguration` validation, Server Actions — untouched.
- Guest form's asymmetric validation (it doesn't require `restDuration > 0` at submit, unlike the
  authenticated form) — pre-existing behavior, not something this change alters or unifies.
- Timer execution/countdown screens, sound playback.
- Any duration input elsewhere in the app outside these two forms.

## Proposal question round

Two decisions below are engineering calls made in this proposal (documented under Approach),
not open business questions — flagging them here anyway since they affect what the user sees:

1. **Wheel picker granularity.** Chose one wheel per single 0–59 value (4 independent trigger +
   modal instances per form, same granularity as `DurationNumberInput`) over a combined
   minute+second dual-wheel-in-one-modal. This is simpler and keeps `DurationWheelInput`'s API
   symmetric with `DurationNumberInput` (same `value`/`onChange` contract, swappable 1:1), at the
   cost of two taps to set one duration group instead of one, and less visual resemblance to the
   issue's reference link (which shows a combined mm:ss wheel). If closer fidelity to that
   reference matters more than API symmetry, say so and we revisit before design/tasks.
2. **Guest form's rest-duration validation stays asymmetric** (no `> 0` requirement, per existing
   behavior) — confirm this is still correct, or should the new components' existence be an
   opportunity to also require `restDuration > 0` for guests?

Both are cheap to flip before implementation. If no correction comes back, proceeding with the
assumptions above.

## Capabilities

### New Capabilities

- None. The component-folder pattern (`{component}.tsx` + `.hook.ts` + `.types.ts` + `index.ts`
  - `__tests__/`) is already codified — this is an instance of it, not a new convention.

### Modified Capabilities

- `timer-configuration-screens` — the "Timer configuration form screen" requirement's duration
  field UI mechanism changes (constrained selector components instead of raw number inputs); the
  existing non-goal "Single combined m:ss text input for durations (two numeric inputs instead)"
  stays true — two separate 0–59 values, still not a single combined text field. Spec phase to
  write the updated scenario text.

## Approach

### Component contracts

Both components share the same value contract so a form can swap one for the other at a
breakpoint without restructuring the surrounding layout:

```ts
interface DurationValueInputProps {
  value: number; // 0–59
  onChange: (value: number) => void;
  "aria-label": string;
}
```

- **`DurationNumberInput`**: renders the existing styled `<input>` (reuses
  `DURATION_INPUT_CLASSNAME`), but the hook filters every keystroke — non-digit characters are
  rejected before they reach state, and any typed value is clamped to `[0, 59]`. Display is
  zero-padded. No invalid or out-of-range value can ever exist in `value`.
- **`DurationWheelInput`**: renders a trigger `<button>` showing the current zero-padded value
  (same visual slot the number input occupies), which opens a shadcn `Dialog` containing one
  scrollable/snap 0–59 wheel. `Confirm` commits the wheel's current position via `onChange` and
  closes; `Cancel`, outside-click, or `Escape` discard and close without calling `onChange`.

### Responsive switching: CSS, not JS

Both forms render both variants for all 4 fields and toggle visibility with Tailwind
`hidden md:block` / `md:hidden`, matching the `md:` breakpoint convention already used in
`timer-configuration-list.tsx`. No `useMediaQuery`/`matchMedia` hook — this avoids
hydration-mismatch risk (SSR can't know viewport size) and keeps both components dumb inputs
driven by the same parent state, rather than introducing conditional mounting logic per form.

### `fieldErrors.roundDuration`/`restDuration` lifecycle — kept, not dead code

These are two structurally different rules:

- **Format/range** ("must be a two-digit 0–59 number") — this is what `DurationNumberInput`/
  `DurationWheelInput` own completely; it's now impossible to enter `99`, `-1`, or a letter.
- **Business rule** ("a round or rest period of exactly `00:00` is not a valid configuration") —
  this is a _semantic_ constraint across the combined minutes+seconds value, not a per-keystroke
  format concern, and `00:00` is a perfectly valid clamped value for either new component to
  hold. The submit-time `roundDuration > 0` / `restDuration > 0` check in
  `timer-configuration-form.hook.ts` therefore stays exactly as-is, and `fieldErrors` display in
  `timer-configuration-form.tsx` stays as a real, load-bearing check — not a fallback for a case
  the components already prevent.

### Prefill removal (guest form) — reversed post-implementation

`guest-timer-form.hook.ts`'s `useEffect` that reads a previous session from `localAdapter.read()`
and calls `setForm(toFormState(existing))` was removed in the first pass, per the issue's "Valor
por defecto SIEMPRE 00:00". After PRs #40–#42 were open, the user explicitly reversed this
decision during manual testing: every visit to `/guest-timer` (including returning after
Stop) must load the last saved configuration from `localAdapter` if one exists. The prefill
`useEffect` was restored unchanged from its pre-issue-#39 form (only the field types differ:
`number` instead of `string`, matching the rest of this change). This supersedes the issue's
literal text — the "always 00:00" requirement no longer applies.

## Affected Areas

| Area                                                                          | Impact    | Description                            |
| ----------------------------------------------------------------------------- | --------- | -------------------------------------- |
| `src/ui/components/duration-number-input/`                                    | New       | Desktop 0–59 input, keystroke-filtered |
| `src/ui/components/duration-wheel-input/`                                     | New       | Mobile/tablet trigger + Dialog + wheel |
| `src/ui/components/shadcn/dialog.tsx`                                         | New       | `npx shadcn add dialog`                |
| `src/ui/components/guest-timer-form/guest-timer-form.tsx`                     | Modified  | 4 inputs → new components              |
| `src/ui/components/guest-timer-form/guest-timer-form.hook.ts`                 | Modified  | Prefill `useEffect` restored (numeric) |
| `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`     | Modified  | 4 inputs → new components              |
| `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts` | Unchanged | `>0` validation stays                  |
| `src/lib/duration.ts`                                                         | Unchanged | Reused as-is                           |
| `openspec/specs/timer-configuration-screens/`                                 | Modified  | Form screen scenario text updated      |

## Risks

| Risk                                                                                                   | Likelihood | Mitigation                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Custom wheel picker (drag/scroll/snap, no library) is the highest-effort, highest-bug-surface piece    | Med        | Isolated in one component's hook, unit-testable interaction math (position → value) independent of DOM gesture wiring |
| ~~Losing guest prefill (resume-editing) UX regresses returning guests~~ — reversed, see below          | N/A        | Prefill restored per explicit user decision post-implementation                                                       |
| CSS-toggled dual-render (both variants mounted) doubles DOM nodes per field                            | Low        | Both are cheap (button/input + hidden dialog), no measurable cost at this scale                                       |
| Wheel picker single-value-per-field choice diverges from issue's reference link (combined mm:ss wheel) | Low        | Flagged in Proposal question round; cheap to change before design/tasks                                               |

## Rollback Plan

Revert the two form files and the hook diff; delete
`src/ui/components/duration-number-input/`, `src/ui/components/duration-wheel-input/`, and
`src/ui/components/shadcn/dialog.tsx`. No other component or layer imports the new pieces, so
removal is isolated.

## Dependencies

- None external. Independent of other open timer issues.

## Success Criteria

- [ ] `DurationNumberInput` and `DurationWheelInput` exist under
      `src/ui/components/`, following the component folder pattern exactly (hook-only tests).
- [ ] Both components share the same `value`/`onChange` (0–59) contract.
- [ ] Neither component can ever produce a value outside `[0, 59]` or a non-integer.
- [ ] `guest-timer-form` and `timer-configuration-form` both consume the same two components for
      all 4 duration fields, with no remaining raw `<input type="number">` for duration.
- [ ] Responsive switch happens at `md:` via Tailwind classes, no JS media-query hook.
- [ ] `guest-timer-form.hook.ts` reads localStorage on mount and prefills the form when a
      previous configuration exists; starts at `00:00` only when none exists.
- [ ] `timer-configuration-form.hook.ts`'s `>0` validation and `fieldErrors` display are
      unchanged and still covered by tests.
- [ ] No native `<input type="time">`, no new npm dependency besides the `dialog` shadcn addition.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` all pass.

# Design: Constrained duration selector inputs (Issue #39)

## Technical Approach

Two new UI-layer-only components, `DurationNumberInput` and `DurationWheelInput`, each following the existing component-folder pattern (`{name}.tsx` presentational + `{name}.hook.ts` all-logic + `{name}.types.ts` + `index.ts` barrel + `__tests__/{name}.hook.test.ts`, hook-only tested — same shape as `rounds-stepper/`). Both share one prop contract:

```ts
interface DurationValueInputProps {
  value: number; // 0–59, always an integer, never out of range
  onChange: (value: number) => void;
  "aria-label": string;
}
```

`guest-timer-form.tsx` and `timer-configuration-form.tsx` render **both** components for each of their 4 duration fields, toggled with Tailwind `hidden md:block` (number) / `md:hidden` (wheel) — no JS media query. This is pure UI-layer work; no domain/application/infrastructure changes (confirmed: `src/lib/duration.ts`'s `splitDuration`/`toTotalSeconds` are reused as-is, `TimerConfiguration` validation is untouched).

The form hooks' `GuestTimerFormState`/`TimerConfigurationFormState` duration fields change type from `string` to `number`, because the new components' `onChange` already delivers a clamped `number` — the `Number(form.roundMinutes)` coercion that exists today only to undo the raw `<input>`'s string value becomes dead code once the source is always a number.

## Architecture Decisions

### Decision: `DURATION_INPUT_CLASSNAME` moves into `DurationNumberInput`, not to `src/lib`

**Choice**: The identical `DURATION_INPUT_CLASSNAME` string currently duplicated verbatim in `guest-timer-form.tsx:12` and `timer-configuration-form.tsx:12` moves to a module-level (unexported) constant inside `duration-number-input.tsx`. It is deleted from both form files with no replacement import.
**Alternatives considered**: (a) Extract to `src/lib/duration-input-classname.ts` or similar shared constant module. (b) Leave duplicated in both forms, import from one into the other.
**Rationale**: Once both forms delegate their 4 duration fields to `<DurationNumberInput>`, the _only_ remaining consumer of this class string is `DurationNumberInput`'s own `<input>` — the two duplicate copies exist today only because two forms each render a raw `<input>` styled the same way, and this change removes both raw `<input>`s. A shared `src/lib` export would be premature generalization for a single consumer (YAGNI/ladder rung 1) and `src/lib/` in this codebase holds utility _functions_ (`duration.ts`, `utils.ts`), not JSX-styling constants — there's no precedent for a className string living there. If a second component ever needs this exact look, promote it then.

### Decision: Keystroke filtering via controlled `onChange` + regex, not `onKeyDown`/`onBeforeInput`

**Choice**: `DurationNumberInput` uses `<input type="text" inputMode="numeric">` (not `type="number"`) with a single `onChange` handler in the hook: strip non-digits (`raw.replace(/\D/g, "")`), take the last 2 characters (`stripped.slice(-2)`) for a rolling two-digit window, parse and clamp to `[0, 59]`, call `onChange`. Empty string → `0`.
**Alternatives considered**: (a) `onKeyDown` character-level rejection. (b) `onBeforeInput` interception. (c) Keep `type="number"` and only clamp the numeric value.
**Rationale**: `onKeyDown` can't handle paste or IME composition and needs separate logic for backspace/selection-replace; `onBeforeInput` has inconsistent cross-browser/testing-library support. `type="number"` still lets the browser accept `e`, `+`, `-`, `.` as valid partial input before our handler ever sees a clean value. A single `onChange`-driven pure string→number transform matches the exact pattern already established by `rounds-stepper.hook.ts`'s `handleInputChange(raw: string)` — same shape, same testability (call the function with strings, assert the number), no DOM APIs needed in the test.
**Display**: `displayValue = String(value).padStart(2, "0")` is what the `<input>`'s `value` attribute always renders — so a value of `5` always shows `"05"`, and typing appends to the full displayed string (typing `9` after `"05"` produces raw `"059"` → sliced to `"59"` → clamped/committed as `59`), giving natural two-digit rolling entry without extra select-on-focus wiring (avoids over-engineering; add select-all-on-focus later only if user testing shows it's needed).

### Decision: `DurationWheelInput`'s wheel uses native CSS scroll-snap, not manual pointer/touch drag math

**Choice**: The wheel is a `<div>` with `overflow-y-scroll`, `scroll-snap-type: y mandatory`, containing 60 items each `scroll-snap-align: center` and a fixed height (`ITEM_HEIGHT` constant), padded top/bottom by half the container height so index `0` and `59` can both reach the visual center. The browser owns all touch/mouse drag, momentum, and snapping. The hook listens to `onScroll`, and after the browser settles on a snap boundary, `scrollTopToValue(scrollTop, ITEM_HEIGHT)` (`clamp(round(scrollTop / ITEM_HEIGHT), 0, 59)`) derives the centered value into local `draft` state. Arrow-key handling (`ArrowUp`/`ArrowDown`) programmatically scrolls by one `ITEM_HEIGHT` for keyboard accessibility.
**Alternatives considered**: (a) Custom pointer/touch event math (`pointerdown`/`pointermove`/`pointerup`, translateY transform, manual momentum + snap-back animation) — the framing implied by the issue's reference link. (b) An external picker library.
**Rationale**: (b) is explicitly out per the proposal ("no external picker lib"). Between the two "no library" options, hand-rolled pointer-drag math is exactly the item the proposal's own Risk table flags as "highest-effort, highest-bug-surface piece" — reimplementing momentum, rubber-banding, and snap-back is a large surface for a single form control. CSS scroll-snap is a native platform feature that already does all of that (ladder rung 4 beats rung 7: native feature over custom code), keeps the _only_ custom logic to one pure, directly-unit-testable conversion function (`scrollTopToValue`/`valueToScrollTop`), and gets free keyboard/touch/mouse scrollability from the browser. If a literal rotating-wheel _visual_ (3D perspective per item) is wanted later, it can be layered on top as a per-item `transform: rotateX()` decoration without touching the interaction model — flagged as a follow-up, not blocking.

### Decision: `DurationWheelInput` commits via local draft state, not directly through `onChange`

**Choice**: The hook holds `draft: number`, seeded from `value` every time the dialog opens (`handleOpenChange(true)` resets `draft = value` and scrolls the container to `valueToScrollTop(value)`). Scrolling updates only `draft`. `Confirm` calls `onChange(draft)` then closes. `Cancel` and Radix's own `onOpenChange(false)` (outside-click, `Escape`) close without ever calling `onChange` — the draft is simply discarded by virtue of never being committed, no explicit "revert" logic needed.
**Alternatives considered**: Call `onChange` on every scroll settle (live-commit, no draft/confirm step).
**Rationale**: The proposal requires confirm/cancel/outside-click semantics matching a picker modal, not a live-updating field — outside-click must discard, which is impossible if every scroll tick already committed. A single local `draft` plus one commit point on `Confirm` is the minimal state needed to satisfy that; `Cancel` and `onOpenChange(false)` collapse to the same "just close" path since neither ever touches `onChange`.

### Decision: `fieldErrors.roundDuration`/`restDuration` and the guest-form prefill removal are UNCHANGED from the proposal

**Choice**: `timer-configuration-form.hook.ts`'s submit-time `roundDuration <= 0` / `restDuration <= 0` check and `fieldErrors` state are untouched — they validate the _combined_ minutes+seconds value (`00:00` is structurally valid but semantically rejected), a business rule the new components (which only constrain a single 0–59 digit group) cannot express. `guest-timer-form.hook.ts`'s localStorage-prefill `useEffect` (and the `toFormState` helper it alone uses) is deleted outright.
**Rationale**: Already locked in the proposal; restated here because the `roundDuration`/`restDuration` type change (string→number, see below) touches the exact lines this check lives on, so it's worth being explicit that the _check itself_ doesn't change, only the types feeding it.

## Data Flow

```
DurationNumberInput (desktop, md:block)
  keystroke ─▶ hook: strip non-digit, slice(-2), clamp[0,59] ─▶ onChange(number) ─▶ parent form state

DurationWheelInput (mobile/tablet, md:hidden)
  open dialog ─▶ draft = value, scroll to valueToScrollTop(value)
  scroll settle ─▶ hook: scrollTopToValue(scrollTop) ─▶ draft
  Confirm ─▶ onChange(draft) ─▶ parent form state ─▶ close
  Cancel / outside-click / Escape ─▶ close, draft discarded, onChange never called

Parent form (guest-timer-form / timer-configuration-form):
  form.roundMinutes/roundSeconds/restMinutes/restSeconds: number (was string)
  ─▶ toTotalSeconds(minutes, seconds) [src/lib/duration.ts, unchanged signature/body]
  ─▶ handleSubmit: business-rule check (roundDuration>0/restDuration>0, timer-configuration-form only)
```

## Responsive Composition (both variants mounted)

Both components render for all 4 fields in both forms, e.g.:

```tsx
<div className="hidden md:block">
  <DurationNumberInput
    value={form.roundMinutes}
    onChange={setRoundMinutes}
    aria-label="Minutos de trabajo"
  />
</div>
<div className="md:hidden">
  <DurationWheelInput
    value={form.roundMinutes}
    onChange={setRoundMinutes}
    aria-label="Minutos de trabajo"
  />
</div>
```

- **No duplicate ids**: neither component renders a DOM `id`; both use `aria-label` directly (matches the existing raw `<input aria-label="...">` fields being replaced — confirmed no `id`/`htmlFor` pairing on any of the 8 duration fields today).
- **No duplicate a11y announcements**: Tailwind's `hidden` compiles to `display: none`, which browsers exclude from the accessibility tree entirely — the inactive variant is invisible to screen readers, not just visually hidden, so there is no double-reading risk and no `aria-hidden` needed on top.
- **Single source of truth**: both variants are fully controlled by the same `value`/`onChange` pair from the parent hook — whichever is visible reflects identical state; the hidden one is inert (not tab-reachable, not clickable) so there's no duplicate-state risk, only the accepted DOM-node-count cost already priced into the proposal's Risk table.

## Hook Responsibilities

| File                            | Owns (tested)                                                                                                                                                                                                   | Presentational `.tsx` owns (untested)                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration-number-input.hook.ts` | `displayValue` (padded string), `handleChange(raw: string): void` (strip/slice/clamp/`onChange` call)                                                                                                           | `<input>` JSX, `className`, wiring `onChange={(e) => handleChange(e.target.value)}`                                                                                             |
| `duration-wheel-input.hook.ts`  | `draft`, `open`, `handleOpenChange(next: boolean)`, `handleScroll(scrollTop: number)`, `handleConfirm()`, `handleArrowKey(direction)`; standalone exported pure functions `scrollTopToValue`/`valueToScrollTop` | `Dialog`/`DialogContent`/`DialogFooter` composition, trigger `<button>{displayValue}</button>`, wheel `<div ref onScroll>` mapping 0–59 items, Confirm/Cancel `<button>` wiring |

`scrollTopToValue`/`valueToScrollTop` are exported as standalone functions from `duration-wheel-input.hook.ts` (not only reachable through `renderHook`) so they're unit-testable directly with plain numbers, mirroring `guest-timer-form.hook.ts`'s existing standalone `toFormState` pattern.

## Form Integration — exact diff shape

### `guest-timer-form.hook.ts`

- **Remove**: the `useEffect` (lines 57–68) reading `localAdapter.read()` and calling `setForm(toFormState(existing))`; the now-unused `toFormState` function; the `useEffect` import (no other `useEffect` call remains in this hook); the `TimerConfiguration` type import (only used by `toFormState`).
- **Type change**: `GuestTimerFormState.roundMinutes/roundSeconds/restMinutes/restSeconds`: `string` → `number`. `EMPTY_FORM` defaults: `""` → `0`.
- **Signature change**: `setRoundMinutes`/`setRoundSeconds`/`setRestMinutes`/`setRestSeconds`: `(value: string) => void` → `(value: number) => void` (setter bodies unchanged — still `setForm((f) => ({ ...f, field: value }))`).
- **Simplify**: `toTotalSeconds(Number(form.roundMinutes), Number(form.roundSeconds))` → `toTotalSeconds(form.roundMinutes, form.roundSeconds)` (values are already numbers; `Number()` coercion is now dead code).
- `isStartEnabled`, `handleSubmit`, `EMPTY_FORM.rounds` (unrelated field) — unchanged.

### `guest-timer-form.tsx`

- Remove `DURATION_INPUT_CLASSNAME` constant.
- Replace each of the 4 `<input type="number">` blocks with the `hidden md:block` / `md:hidden` `DurationNumberInput`/`DurationWheelInput` pair shown above, passing the same `aria-label` strings already in place ("Minutos de trabajo", "Segundos de trabajo", "Minutos de descanso", "Segundos de descanso").
- Add imports for `DurationNumberInput`, `DurationWheelInput`.

### `timer-configuration-form.hook.ts`

- **Type change only**: same `string` → `number` change as above for `TimerConfigurationFormState`'s 4 duration fields and setter signatures; `Number()` coercion removed from the `handleSubmit` body's `toTotalSeconds` calls.
- **Unchanged**: the `roundDuration <= 0` / `restDuration <= 0` `fieldErrors` block, `toFormState` (still needed here — it hydrates from `initialConfiguration` for the authenticated edit flow, a _different_ mechanism from the guest form's removed localStorage prefill; keep it, just drop its `String(...)` wraps since `splitDuration` already returns numbers), `ERROR_CODE_COPY`, `handleSubmit` control flow.

### `timer-configuration-form.tsx`

- Same 4-field swap as `guest-timer-form.tsx`; `{fieldErrors.roundDuration && ...}` / `{fieldErrors.restDuration && ...}` blocks stay exactly where they are, rendered below the new component pairs exactly as they were below the old raw inputs.

### `guest-timer-form.types.ts` / `timer-configuration-form.types.ts`

- Field type updates only (`string` → `number` on the 4 duration fields and their setters), no structural changes.

### Existing hook tests (flagged for the tasks phase, not written here)

`guest-timer-form.hook.test.ts` and `timer-configuration-form.hook.test.ts` currently call `setRoundMinutes("1")` / assert `form.roundMinutes` `toBe("1")` (string literals) — these must be updated to numeric literals (`setRoundMinutes(1)`, `toBe(1)`) as part of implementing this change; also drop the guest-hook test's `localAdapter.read()`-based prefill assertions since that `useEffect` no longer exists.

## `npx shadcn add dialog`

`components.json`'s `aliases.ui` is `@/ui/components` (flat) — the CLI writes `src/ui/components/dialog.tsx`. Per AGENTS.md, this needs a manual move to `src/ui/components/shadcn/dialog.tsx`, matching the precedent already followed for all 5 existing shadcn files (`button.tsx`, `card.tsx`, `input.tsx`, `separator.tsx`, `switch.tsx` — all under `shadcn/`, none flat). `DurationWheelInput` imports it as `@/ui/components/shadcn/dialog`.

## File Changes

| File                                                                                         | Action              | Description                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| `src/ui/components/duration-number-input/duration-number-input.tsx`                          | Create              | Presentational `<input>`, no logic                                                                  |
| `src/ui/components/duration-number-input/duration-number-input.hook.ts`                      | Create              | `displayValue`, `handleChange`                                                                      |
| `src/ui/components/duration-number-input/duration-number-input.types.ts`                     | Create              | Shared `DurationValueInputProps` shape                                                              |
| `src/ui/components/duration-number-input/index.ts`                                           | Create              | Barrel export                                                                                       |
| `src/ui/components/duration-number-input/__tests__/duration-number-input.hook.test.ts`       | Create              | Padding, digit-strip, clamp, empty-string tests                                                     |
| `src/ui/components/duration-wheel-input/duration-wheel-input.tsx`                            | Create              | Trigger button + Dialog + wheel JSX                                                                 |
| `src/ui/components/duration-wheel-input/duration-wheel-input.hook.ts`                        | Create              | `draft`, `handleOpenChange`, `handleScroll`, `handleConfirm`, `scrollTopToValue`/`valueToScrollTop` |
| `src/ui/components/duration-wheel-input/duration-wheel-input.types.ts`                       | Create              | Reuses/mirrors `DurationValueInputProps`                                                            |
| `src/ui/components/duration-wheel-input/index.ts`                                            | Create              | Barrel export                                                                                       |
| `src/ui/components/duration-wheel-input/__tests__/duration-wheel-input.hook.test.ts`         | Create              | `scrollTopToValue`/`valueToScrollTop` boundaries, confirm/cancel/open-reset behavior                |
| `src/ui/components/shadcn/dialog.tsx`                                                        | Create              | `npx shadcn add dialog`, manually moved                                                             |
| `src/ui/components/guest-timer-form/guest-timer-form.tsx`                                    | Modify              | 4 inputs → 4 responsive pairs, drop classname const                                                 |
| `src/ui/components/guest-timer-form/guest-timer-form.hook.ts`                                | Modify              | Remove prefill `useEffect`/`toFormState`, `string`→`number` fields                                  |
| `src/ui/components/guest-timer-form/guest-timer-form.types.ts`                               | Modify              | Field types `string` → `number`                                                                     |
| `src/ui/components/guest-timer-form/__tests__/guest-timer-form.hook.test.ts`                 | Modify              | Numeric setter calls/assertions, drop prefill tests                                                 |
| `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`                    | Modify              | 4 inputs → 4 responsive pairs, drop classname const                                                 |
| `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts`                | Modify              | `string`→`number` fields, drop `Number()`/`String()` coercions                                      |
| `src/ui/components/timer-configuration-form/timer-configuration-form.types.ts`               | Modify              | Field types `string` → `number`                                                                     |
| `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts` | Modify              | Numeric setter calls/assertions                                                                     |
| `src/lib/duration.ts`                                                                        | Unchanged           | Reused as-is                                                                                        |
| `openspec/specs/timer-configuration-screens/spec.md`                                         | Modify (spec phase) | Duration field UI mechanism scenario text                                                           |

## Interfaces / Contracts

```ts
// src/ui/components/duration-number-input/duration-number-input.types.ts
export interface DurationValueInputProps {
  value: number; // 0–59
  onChange: (value: number) => void;
  "aria-label": string;
}

export interface UseDurationNumberInputResult {
  displayValue: string; // always 2 digits, e.g. "05"
  handleChange: (raw: string) => void;
}
```

```ts
// src/ui/components/duration-wheel-input/duration-wheel-input.hook.ts
export function scrollTopToValue(
  scrollTop: number,
  itemHeight: number
): number {
  return Math.min(59, Math.max(0, Math.round(scrollTop / itemHeight)));
}

export function valueToScrollTop(value: number, itemHeight: number): number {
  return value * itemHeight;
}

export interface UseDurationWheelInputResult {
  open: boolean;
  displayValue: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleOpenChange: (next: boolean) => void;
  handleScroll: (scrollTop: number) => void;
  handleConfirm: () => void;
  handleArrowKey: (direction: "up" | "down") => void;
}
```

## Testing Strategy

| Layer                                           | What to Test                                                                                                                                                        | Approach                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `duration-number-input.hook.ts`                 | `displayValue` padding (`5` → `"05"`, `0` → `"00"`); `handleChange` strips non-digits, clamps `[0,59]`, rolling last-2-digit window, empty string → `0`             | `renderHook`, no mocks, pure string→number assertions |
| `duration-wheel-input.hook.ts` (pure functions) | `scrollTopToValue`/`valueToScrollTop` boundaries (0, 59, negative/over-range clamped)                                                                               | Direct function calls, no `renderHook` needed         |
| `duration-wheel-input.hook.ts` (stateful)       | `handleOpenChange(true)` resets `draft` to `value`; `handleConfirm` calls `onChange(draft)` once and closes; `handleOpenChange(false)`/Cancel never call `onChange` | `renderHook`, mock `onChange`                         |
| `guest-timer-form.hook.ts`                      | Existing START-enablement tests updated to numeric setter calls; prefill tests removed (feature deleted)                                                            | `renderHook` + `jsdom`, existing mocks                |
| `timer-configuration-form.hook.ts`              | Existing `fieldErrors`/submit tests updated to numeric setter calls; behavior otherwise unchanged                                                                   | `renderHook` + `jsdom`, existing mocks                |

Presentational `.tsx` files (`duration-number-input.tsx`, `duration-wheel-input.tsx`, both form `.tsx` files) are not tested, per AGENTS.md.

## Migration / Rollout

No data migration. Guest localStorage records already store `TimerConfiguration` (numbers), unaffected by this UI-only change. Rollback = revert the 4 form files + hook/type diffs, delete the two new component folders and `shadcn/dialog.tsx` — no other code imports them (confirmed via CodeGraph: `RoundsStepper`, `guest-timer-active`, and use-case files have no dependency on the touched form files beyond what's already covered here).

## Open Questions

- None blocking. The proposal's two flagged product questions (wheel granularity, guest rest-duration asymmetric validation) remain open for the user to confirm before/at spec phase — this design proceeds on the proposal's stated assumptions (single-wheel-per-field, asymmetric validation unchanged) since both are cheap to flip later without touching the architecture above.

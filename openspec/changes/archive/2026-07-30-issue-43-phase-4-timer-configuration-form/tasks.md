# Tasks: Timer-configuration-form duration selector integration (Issue #43, Phase 4)

Sequential chain, each task GREEN-gates the next: T1(RED) → T2 → T3 → T4(GREEN). No parallelism — all 4 files form one type-cascade, edits are order-dependent (test expectations before types, types before hook, hook before component).

## T1 — 4.1 (RED): update hook test literals string → number

- [x] **File**: `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts`
- [x] **Satisfies**: spec scenarios 1, 2 (numeric state on mount, numeric setter calls).
- [x] **Changes**:
  - L48-51: `toBe("1")/toBe("30")/toBe("0")/toBe("45")` → `toBe(1)/toBe(30)/toBe(0)/toBe(45)`
  - L65-68: `setRoundMinutes("1")` etc → `setRoundMinutes(1)` etc (4 calls)
  - L104-105: `setRoundMinutes("1")`, `setRestMinutes("1")` → numeric
  - L122-123: same pair → numeric
- [x] **Acceptance**: test suite fails to compile/run against current `string`-typed hook (RED) — confirms test now encodes the target numeric contract.
- [x] **Status**: COMPLETE (commit 8e8a39b)

## T2 — 4.2 (GREEN): update types, duration fields + setters → number

- [x] **File**: `src/ui/components/timer-configuration-form/timer-configuration-form.types.ts`
- [x] **Satisfies**: spec requirement "TimerConfigurationFormState's 4 duration fields ... MUST hold/accept number, never string".
- [x] **Changes**:
  - L12-15: `roundMinutes/roundSeconds/restMinutes/restSeconds: string` → `: number`
  - L32-35: `setRoundMinutes/setRoundSeconds/setRestMinutes/setRestSeconds: (value: string) => void` → `(value: number) => void`
- [x] **Acceptance**: `npx tsc --noEmit` now flags `timer-configuration-form.hook.ts` and `.tsx` as mismatched (expected, fixed in T3/T4); T1's test file type-checks clean against new types.
- [x] **Status**: COMPLETE (commit 5329f50)

## T3 — 4.3 (GREEN): update hook, remove coercions, keep validation

- [x] **File**: `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts`
- [x] **Satisfies**: spec requirement "no String()/Number() coercion remains in toFormState()/handleSubmit()"; "roundDuration > 0 / restDuration > 0 ... validation ... MUST NOT change in behavior".
- [x] **Changes**:
  - L22-25 (`EMPTY_FORM`): `roundMinutes: "", roundSeconds: "", restMinutes: "", restSeconds: ""` → `roundMinutes: 0, roundSeconds: 0, restMinutes: 0, restSeconds: 0`
  - L43-46 (`toFormState`): `String(round.minutes)` → `round.minutes` (×4, drop all `String()` wraps)
  - L106-113 (`handleSubmit`): `toTotalSeconds(Number(form.roundMinutes), Number(form.roundSeconds))` → `toTotalSeconds(form.roundMinutes, form.roundSeconds)` (×2, drop all `Number()` wraps)
  - Setter bodies (L76-91) keep `(value: string)` → `(value: number)` param type only — logic unchanged
- [x] **Acceptance**: T1 test suite passes (GREEN); `npx tsc --noEmit` clean for hook + types; validation branches (`roundDuration <= 0` / `restDuration <= 0`) untouched, no `String()`/`Number()` remains.
- [x] **Status**: COMPLETE (commit 2af0808)

## T4 — 4.4 (GREEN): swap raw inputs for responsive duration components

- [x] **File**: `src/ui/components/timer-configuration-form/timer-configuration-form.tsx`
- [x] **Satisfies**: spec requirement "Each of the 4 duration fields MUST be rendered via DurationNumberInput/DurationWheelInput, toggled by md: breakpoint"; scenarios 7, 8, 9.
- [x] **Changes** (mirror `guest-timer-form.tsx` L47-79/86-118 exactly):
  - Add imports: `DurationNumberInput` from `@/ui/components/duration-number-input`, `DurationWheelInput` from `@/ui/components/duration-wheel-input`
  - Remove `DURATION_INPUT_CLASSNAME` const (L12-13)
  - Replace L71-78 (`roundMinutes` raw input) with paired `hidden md:block`/`md:hidden` wrapper divs (`DurationNumberInput` + `DurationWheelInput`, `aria-label="Minutos de trabajo"`)
  - Same pattern for `roundSeconds` (L82-89, `aria-label="Segundos de trabajo"`), `restMinutes` (L103-110, `aria-label="Minutos de descanso"`), `restSeconds` (L114-121, `aria-label="Segundos de descanso"`) — 8 wrapper divs total, 4 fields × 2 variants
- [x] **Acceptance**: no raw `<input type="number">` remains; `npx tsc --noEmit` clean; `npm run test` full suite GREEN; visual/manual check of responsive toggle (not automated, per design's Testing Strategy — matches Phase 3 precedent).
- [x] **Status**: COMPLETE (commit 3d837ad)

## Summary

**Total Workload**: 13 + 8 + 16 + 95 = ~132 lines changed, well under the 400-line review budget.

**All 4 tasks**: ✓ COMPLETE

- T1 (4.1) hook test RED → GREEN: ✓ commit 8e8a39b
- T2 (4.2) types: ✓ commit 5329f50
- T3 (4.3) hook: ✓ commit 2af0808
- T4 (4.4) component: ✓ commit 3d837ad

**Verification**: npm run lint clean (0 errors), npx tsc --noEmit clean, npm run test 283/283 passed.

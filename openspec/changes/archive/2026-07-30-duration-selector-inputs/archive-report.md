# Archive Report: duration-selector-inputs

**Status**: ARCHIVED — all 5 phases implemented and verified.

**Archived**: 2026-07-30

## Executive Summary

Duration fields across the app are now authored through a responsive component pair — `DurationNumberInput` (desktop, text entry) and `DurationWheelInput` (mobile, wheel picker) — with numeric state end-to-end. This replaced the raw `<input type="number">` controls, whose spinner arrows and full-width keyboard were unusable on mobile (issue #43).

The change shipped across two pull requests:

| Phases | Scope                                                             | PR  |
| ------ | ----------------------------------------------------------------- | --- |
| 1–2    | `DurationNumberInput` + `DurationWheelInput` components and hooks | #40 |
| 3      | `guest-timer-form` integration                                    | #47 |
| 4      | `timer-configuration-form` integration                            | #47 |
| 5      | Verification                                                      | #47 |

Phase 4 was planned and archived as its own sub-change (`issue-43-phase-4-timer-configuration-form`, archived 2026-07-30) because it ran as a separate SDD cycle. Its archive report holds the per-task detail and is not duplicated here.

## Behavior Changes

- **Duration state is numeric end-to-end.** Form state, setters, and defaults are `number`; all `String()`/`Number()` coercions around `toTotalSeconds`/`toFormState` are gone.
- **Guest form no longer prefills.** The mount-time `localAdapter.read()` prefill was removed; the form always starts at 0. The write-on-submit path is unaffected, and `guest-timer-active` still reads the stored configuration to run the timer.
- **Durations are capped at 59:59.** The components clamp each field to `[0, 59]`, which made the minutes:seconds pair the effective domain range. That constraint was implicit until a review comment on PR #47 surfaced it; `MAX_DURATION_SECONDS = 3599` now lives in `src/domain/errors/timer-configuration-errors.ts` and both validators reject anything above it (commit 9ee484c).

## Verification Results

Run on branch `issue-43-guest-timer-mobile-duration-inputs`:

- `npm run test` — 288/288 across 49 files.
- `npx tsc --noEmit` — clean, confirming the `string` → `number` cascade is complete in both forms.
- `npm run lint` — 0 errors (16 pre-existing warnings in unrelated files).
- No `<input type="number">` remains for a duration field in either form.
- `guest-timer-form.hook.ts` no longer calls `localAdapter.read()`.

## Design Decision Worth Keeping

Both variants mount simultaneously per field, toggled by `hidden md:block` / `md:hidden`. This is deliberate and was re-confirmed under review: the server has no viewport, so a JS media-query single render would either hydrate mismatched or flash the wrong variant on first paint. The cost is low because shadcn's `DialogContent` has no `forceMount` — a closed wheel picker renders only its trigger button, not the portal or its 60 option nodes.

## Specs Merged

**Domain**: `timer-configuration-screens` — requirement "Timer configuration form screen (create + edit)" updated for numeric state, the component pair, the responsive toggle, and the absence of coercions. Validation semantics and `fieldErrors` display preserved exactly.

**Location**: `openspec/specs/timer-configuration-screens/spec.md`

## Rollback Plan

Revert the two form folders (`guest-timer-form/`, `timer-configuration-form/`) and the `MAX_DURATION_SECONDS` cap. The `DurationNumberInput`/`DurationWheelInput` components can stay — nothing else imports them, so leaving them in place is inert.

## SDD Cycle Status

**COMPLETE AND CLOSED** — exploration, proposal, design, spec, tasks, apply, and verify all done across phases 1–5.

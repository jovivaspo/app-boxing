# Proposal: Timer Activo engine (issue #22)

## Intent

Timers can be created, listed, and edited (#21, merged) but never **run**. The core product promise — a boxing round timer you actually train with — is missing. This change adds the countdown engine and the "Timer Activo" screen so a saved configuration becomes a usable training session.

## Scope

### In Scope

- Pure domain state machine: work ↔ rest phases, round progression, remaining time computed from injected timestamps, `running | paused | finished` transitions. Zero React/browser deps, tested with fake `Date.now()`.
- Drift-free countdown: remaining time is always `duration - (now - phaseStart)`, never an accumulated decrement. rAF (or ~250ms interval) is only a re-render trigger; a `visibilitychange` listener forces an immediate recompute on refocus.
- Controls: pause, resume, stop (stop ends the session and returns to `/timers`).
- 10s warning cue gated by `warnBeforeEnd`; bell on phase transitions gated by `bellSound`, played through a small browser-only audio adapter (A1 pattern, precedent `createGsiLoaderAdapter()`), unlocked by the user's Start gesture.
- New route `src/app/timers/[id]/active/page.tsx` — Server Component composition root mirroring `[id]/edit/page.tsx` exactly (`force-dynamic`, session resolution, auth fetches config server-side with `notFound()` on `TimerConfigurationNotFound`, guest receives `timerId` and resolves client-side).
- Entry point from the timer list card to start a session.
- Bell sound asset in `public/`.

### Out of Scope / Non-Goals

- **No changes to existing timer-configuration domain / application / infrastructure code.** Purely additive.
- **No light-theme or dark-mode-toggle work.** The app has no light theme (`globals.css` sets all tokens in `:root`; no `.dark` class, no toggle, zero `dark:` usages). Building with existing `bg-background` tokens already satisfies the black-background constraint. Do not "fix" this later by adding a theme system.
- No session history/persistence, no partial-session saving, no stats, no background/lock-screen or Web Worker execution, no wake-lock, no bottom nav.
- No new dependencies.

## Visual constraint

The "Timer Activo" screen MUST visually match the Google Stitch mock (project `6380251267090136078`, screen "Timer Activo - Iron Pulse", `screens/c71ac1a9af244894a9f2e97daac7e5f4`) in layout, components, and hierarchy.

**Corrected premise (2026-07-27):** the user initially asked for "black background instead of the Stitch mock's white," assuming the mock was light. The orchestrator pulled the actual mock screenshot via the Stitch MCP tools and confirmed it is **already dark/black** (near-black background, red progress ring, red "WORK" badge, red "PAUSE" button, dark-gray "STOP" button) — there is no white background to deviate from. There is no deviation to make: build the screen as a faithful reproduction of the mock. This coincidentally requires the same zero extra theme work already noted (the app has no light theme), but the "black instead of white" framing is retired — replaced by a literal component inventory below.

**Confirmed screen contents** (from the mock screenshot):

- Header row: a bell/notification icon chip and a warning-triangle "10S" chip, side by side.
- "WORK" badge (red background, white text) — badge text/color presumably swaps to a REST variant during rest phases (not visible in this static mock frame).
- Large countdown display, e.g. "02:45", in a light/white monospace-ish numeral style, centered.
- A circular progress ring (red stroke) surrounding the badge + countdown + round text.
- Small caption "CURRENT PROGRESS" above "ROUND 4" with "/ 12" below it, centered inside the ring.
- Two-button row below the ring: "STOP" (dark-gray/neutral background, left) and "PAUSE" (red background, right), each with a small icon above/beside the label.

## Capabilities

### New Capabilities

- `timer-active-session`: running a saved configuration — phase/round state machine, drift-free countdown, pause/resume/stop, warning and bell cues, and the Timer Activo screen + route.

### Modified Capabilities

- `timer-configuration-screens`: the list card gains a start/play entry point navigating to `/timers/[id]/active`.

## Approach

**Architecture deviation — explicit call, confirmed by user.** The round state machine lives in a pure domain module; the UI hook calls it **directly, with no application use-case wrapper**. The project's "every port call goes through a use case" precedent (D1/D4 of the archived timer-configuration design) is about mediating a _repository port_. A running session touches no port — a use case here would be an empty passthrough with nothing to orchestrate. Config _loading_ still goes through the existing `getTimerConfiguration` use case, unchanged.

**Layering.**

| Piece         | Location                              | Responsibility                                                                                                          |
| ------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| State machine | `src/domain/timer-session/`           | phase/round transitions, remaining-time math, pure                                                                      |
| Screen        | `src/ui/components/timer-active/`     | presentational `.tsx` + `.hook.ts` (timer loop, visibility, cues) + `.types.ts` + `index.ts` + `__tests__/` (hook only) |
| Audio         | `src/infraestructure/audio/`          | browser-only adapter behind an injectable default                                                                       |
| Route         | `src/app/timers/[id]/active/page.tsx` | composition root, auth/guest branch                                                                                     |

## Affected Areas

| Area                                          | Impact   | Description                       |
| --------------------------------------------- | -------- | --------------------------------- |
| `src/domain/timer-session/`                   | New      | pure state machine + tests        |
| `src/ui/components/timer-active/`             | New      | screen + hook + hook tests        |
| `src/infraestructure/audio/`                  | New      | bell adapter + tests              |
| `src/app/timers/[id]/active/page.tsx`         | New      | route + `__tests__/page.test.tsx` |
| `src/ui/components/timer-configuration-card/` | Modified | start action                      |
| `public/`                                     | New      | bell sound asset                  |

## Risks

| Risk                                                                                          | Likelihood | Mitigation                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REST-phase badge/ring styling not visible in the static mock (only a WORK-phase frame exists) | Low        | Design phase should extrapolate a REST variant (e.g. same layout, different accent color/label) consistent with the app's existing palette, and confirm with the user if ambiguous |
| Browser autoplay blocks the bell                                                              | Med        | Unlock audio on the Start gesture; explicit design decision, not implicit                                                                                                          |
| rAF suspended/throttled while backgrounded                                                    | Med        | `visibilitychange`-forced recompute is mandatory, not optional                                                                                                                     |
| Sound asset licensing                                                                         | Med        | Source a CC0/public-domain bell before apply                                                                                                                                       |

## Rollback Plan

Purely additive except the start action on the timer card. Revert the branch, or delete `src/domain/timer-session/`, `src/ui/components/timer-active/`, `src/infraestructure/audio/`, `src/app/timers/[id]/active/`, the asset, and the card's start button. Nothing existing depends on them.

## Dependencies

- #21 timer-configuration list/form screens — closed and merged.
- A licensed bell audio asset (not yet sourced).

## Success Criteria

- [ ] Starting a timer runs the configured rounds with correct work/rest alternation and round counter
- [ ] Countdown stays accurate after the tab is backgrounded for minutes and refocused (no drift)
- [ ] Pause freezes the countdown; resume continues from the frozen value; stop returns to `/timers`
- [ ] 10s warning fires only when `warnBeforeEnd`; bell only when `bellSound`
- [ ] Screen faithfully reproduces the "Timer Activo - Iron Pulse" Stitch mock layout (already dark/black in the source mock)
- [ ] Works identically for guests and authenticated users
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` pass

## Decisions log

- 2026-07-27: corrected a wrong initial premise — the user asked for "black instead of the Stitch mock's white," assuming the mock was light. The orchestrator fetched the actual "Timer Activo - Iron Pulse" mock via Stitch MCP and confirmed it is already dark/black. No deviation exists; the screen should faithfully reproduce the mock (which already matches the app's dark-only theme).
- 2026-07-27: proposal question round resolved by user — (1) dedicated start/play action on the timer card (not a fully clickable card); (2) on finishing the last round, show a `finished` state on screen with a final bell, user returns to `/timers` manually (no auto-redirect); (3) architecture deviation confirmed — pure domain state machine + UI hook, no application use-case layer, since no repository port exists to mediate a running session.
- 2026-07-27: bell asset licensing (CC0/public-domain) and countdown framing (`m:ss`, consistent with the list screen) proceed as originally assumed — not blocking, not escalated further.

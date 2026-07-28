# Timer Active Session Specification

## Purpose

Defines the running-session experience for a saved `TimerConfiguration`: the
phase/round state machine, drift-free countdown, pause/resume/stop controls,
warning and bell cues, the `/timers/[id]/active` route, and the Timer Activo
screen (Issue #22).

## Requirements

### Requirement: Round phase state machine

A running session MUST be a state machine with states `running`, `paused`,
`finished`, alternating `work`/`rest` phases per round. The round counter
increments when a `work` phase starts. The final round's `work` phase MUST
transition directly to `finished` — no trailing `rest` phase after the last
round.

#### Scenario: Session starts

- GIVEN a configuration with N rounds
- WHEN the session starts
- THEN state is `running`, phase is `work`, round is 1

#### Scenario: Non-final round completes

- GIVEN `work` phase of round R (R < N) reaches zero remaining time
- WHEN the phase timer elapses
- THEN it transitions to `rest` of round R, then to `work` of round R+1 when rest elapses

#### Scenario: Final round ends the session

- GIVEN `work` phase of round N reaches zero
- WHEN the phase timer elapses
- THEN the machine transitions to `finished` and MUST NOT start a rest phase

### Requirement: Drift-free countdown

Remaining phase time MUST be computed as `phaseDuration - (now - phaseStartTimestamp)` on every tick, never as a decremented counter, and MUST be recomputed immediately when the document regains visibility.

#### Scenario: Tab backgrounded and refocused

- GIVEN a running phase with 60s duration
- WHEN the tab is backgrounded for 200s and refocused
- THEN the displayed remaining time MUST reflect true elapsed wall-clock time, with no drift

### Requirement: Playback controls

The system MUST support `pause` (freezes remaining time, state → `paused`), `resume` (continues counting down from the frozen value, state → `running`), and `stop` (ends the session, navigates to `/timers`, persists nothing).

#### Scenario: Pause freezes time

- GIVEN a running phase with X seconds remaining
- WHEN pause is triggered
- THEN state becomes `paused` and displayed remaining time stays X regardless of elapsed time

#### Scenario: Resume continues from frozen value

- GIVEN a paused session with X seconds remaining
- WHEN resume is triggered
- THEN state becomes `running` and the phase continues from X, not from the original duration

#### Scenario: Stop discards progress

- GIVEN a session in any state
- WHEN stop is triggered
- THEN the system navigates to `/timers` and persists no round/phase/remaining-time progress

### Requirement: Phase-end warning cue

When `warnBeforeEnd` is `true`, the system MUST fire a warning cue exactly once per phase when 10 seconds remain; when `false`, no warning MUST fire.

#### Scenario: Warning enabled

- GIVEN `warnBeforeEnd: true`
- WHEN a phase's remaining time crosses 10 seconds
- THEN the warning cue fires exactly once for that phase

#### Scenario: Warning disabled

- GIVEN `warnBeforeEnd: false`
- WHEN a phase's remaining time crosses 10 seconds
- THEN no warning cue fires

### Requirement: Phase-transition bell cue

When `bellSound` is `true`, the system MUST play a bell on every phase transition (`work→rest`, `rest→work`, entering `finished`); when `false`, no bell MUST play. Audio playback MUST be unlocked by the user's Start-click gesture before any bell can be heard (autoplay policy).

#### Scenario: Bell enabled fires on every transition

- GIVEN `bellSound: true` and audio unlocked by the Start gesture
- WHEN any phase transition occurs, including entering `finished`
- THEN a bell sound plays

#### Scenario: Bell disabled

- GIVEN `bellSound: false`
- WHEN any phase transition occurs
- THEN no bell sound plays

### Requirement: Timer Activo route composition

`src/app/timers/[id]/active/page.tsx` MUST resolve identity server-side. Authenticated sessions MUST fetch the `TimerConfiguration` via the existing `getTimerConfiguration` use case and call `notFound()` when it throws `TimerConfigurationNotFound`. Guest identities MUST receive only `timerId`, resolving the configuration client-side via the existing local adapter path.

#### Scenario: Authenticated, record exists

- GIVEN a valid session and an id with a matching backend record
- WHEN `/timers/[id]/active` is requested
- THEN the configuration is fetched server-side and passed to the screen

#### Scenario: Authenticated, record missing

- GIVEN a valid session and an id with no matching backend record
- WHEN `/timers/[id]/active` is requested
- THEN the route calls `notFound()`

#### Scenario: Guest identity

- GIVEN no valid session
- WHEN `/timers/[id]/active` is requested
- THEN the route passes only `timerId` to the screen for client-side resolution

### Requirement: Timer Activo screen layout

The screen MUST render: a header row with a bell-state chip and a warning-state chip; a phase badge reading `WORK` or `REST`; a large centered unpadded `m:ss` countdown; a circular progress ring around the badge/countdown; a round caption showing current/total rounds; and a control row of `STOP` and a `PAUSE`/`RESUME` toggle button.

#### Scenario: Work vs rest rendering

- GIVEN the session is in a `work` or `rest` phase
- WHEN the screen renders
- THEN the badge and countdown reflect that phase's label and remaining time

#### Scenario: Paused toggle label

- GIVEN the session is `paused`
- WHEN the screen renders
- THEN the toggle button reads `RESUME` instead of `PAUSE`

#### Scenario: Finished state

- GIVEN the machine reached `finished`
- WHEN the screen renders
- THEN it shows a distinct finished state with a manual action back to `/timers` and does not auto-navigate

## Non-Goals

- Session history/persistence, partial-session saving, stats.
- Background/lock-screen execution, Web Workers, wake-lock.
- Bottom navigation.
- New dependencies.

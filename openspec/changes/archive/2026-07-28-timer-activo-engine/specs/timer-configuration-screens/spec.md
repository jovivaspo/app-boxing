# Delta for Timer Configuration Screens

## MODIFIED Requirements

### Requirement: Timer list screen (`/timers`)

`/timers` MUST render every saved `TimerConfiguration` for the current identity (authenticated backend records, or guest local records) with its level badge, rounds, work/rest durations in `m:ss`, and a start/play action, and MUST be reachable without authentication.
(Previously: same, without the start/play action.)

#### Scenario: Configurations exist

- GIVEN one or more stored configurations
- WHEN `/timers` is requested
- THEN each renders as a card with name, level badge (`calculateTimerLevel`), rounds, and `m:ss` work/rest durations

#### Scenario: No configurations exist

- GIVEN zero stored configurations
- WHEN `/timers` is requested
- THEN it MUST render only the "Nuevo Timer" card plus a short inviting line — no other empty-state UI

#### Scenario: Delete without confirmation

- GIVEN a rendered configuration card
- WHEN its delete action is triggered
- THEN the system MUST delete it immediately, with no confirmation dialog

#### Scenario: Navigation

- GIVEN the list screen
- WHEN the user activates a card's edit action, or the "Nuevo Timer" action
- THEN the system MUST navigate to `/timers/[id]/edit` or `/timers/new` respectively

#### Scenario: Start a session

- GIVEN a rendered configuration card
- WHEN its dedicated start/play action is activated
- THEN the system MUST navigate to `/timers/[id]/active` for that card's id

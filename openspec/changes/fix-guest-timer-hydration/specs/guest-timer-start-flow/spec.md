# Delta for Guest Timer Start Flow

(Stacked on the pending `guest-timer-start-flow` delta introduced by the
unarchived `guest-timer-single-config` change — that change has not yet
produced a main spec at `openspec/specs/guest-timer-start-flow/spec.md`.
This delta augments that pending capability with a hydration-safety
guarantee; it does not restate or alter its existing requirements.)

## ADDED Requirements

### Requirement: Hydration-safe prefill on guest routes

Both `/guest-timer` and `/guest-timer-active` MUST render without a
hydration mismatch when a guest configuration already exists in
`localStorage`. The storage-derived update (prefilled form values on
`/guest-timer`, or the resolved configuration/redirect on
`/guest-timer-active`) MUST still be applied — it MAY arrive one render
tick after the initial hydrated render, but MUST NOT be lost or skipped.

#### Scenario: `/guest-timer` reloads clean with a saved configuration

- GIVEN a guest configuration already exists in `localStorage`
- WHEN `/guest-timer` is loaded and hydrates
- THEN no hydration mismatch occurs
- AND the form is still prefilled with the stored values, even if that happens on a render after the initial hydrated one

#### Scenario: `/guest-timer-active` reloads clean with a saved configuration

- GIVEN a guest configuration already exists in `localStorage`
- WHEN `/guest-timer-active` is loaded and hydrates
- THEN no hydration mismatch occurs
- AND the session still starts from that stored configuration, even if that happens on a render after the initial hydrated one

#### Scenario: Guard redirect on `/guest-timer-active` still fires

- GIVEN no guest configuration exists in `localStorage`
- WHEN `/guest-timer-active` is loaded and hydrates
- THEN the redirect to `/guest-timer` MUST still occur, unaffected by the hydration gate

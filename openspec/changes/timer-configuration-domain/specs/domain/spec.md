# Domain Specification: Timer Configuration

## Purpose

Defines the `TimerConfiguration` data shape, the `calculateTimerLevel` pure
function, and the `validateTimerConfiguration` validation function as the
framework-free domain core for the timer feature (Issue #17). No
application, infrastructure, or UI behavior is defined here.

## Requirements

### Requirement: TimerConfiguration data shape

The system MUST define `TimerConfiguration` as a plain TypeScript interface
with exactly these fields:

| Field           | Type      | Unit / Notes |
| --------------- | --------- | ------------ |
| `name`          | `string`  | display name |
| `rounds`        | `number`  | round count  |
| `roundDuration` | `number`  | seconds      |
| `restDuration`  | `number`  | seconds      |
| `warnBeforeEnd` | `boolean` | —            |
| `bellSound`     | `boolean` | —            |

The interface MUST NOT include a `level` field — level is derived, never
stored. The system MUST NOT provide a factory function whose purpose is
deriving or caching `level`; callers build the object literal directly and
call `calculateTimerLevel` on demand. (See the separate `validateTimerConfiguration`
requirement below for input validation, which is a distinct concern.)

#### Scenario: Shape is a plain data contract

- GIVEN a value that satisfies the `TimerConfiguration` interface
- WHEN it is used anywhere in the codebase
- THEN it MUST contain exactly `name`, `rounds`, `roundDuration`,
  `restDuration`, `warnBeforeEnd`, `bellSound`, and no `level` field

### Requirement: calculateTimerLevel pure function

The system MUST expose `calculateTimerLevel(config: Pick<TimerConfiguration,
"rounds" | "roundDuration" | "restDuration">): TimerLevel` as a standalone
pure function. It MUST NOT be a method on an object, MUST NOT cache or store
its result, and MUST be callable on demand with only the three listed fields.

`TimerLevel` MUST be the union type `"amateur" | "pro" | "elite"`.

Classification MUST be based on `rounds` using these thresholds:

| Rounds | Level     |
| ------ | --------- |
| ≤ 7    | `amateur` |
| 8–12   | `pro`     |
| ≥ 13   | `elite`   |

#### Scenario: 7 rounds classifies as amateur (upper boundary)

- GIVEN a config with `rounds: 7`
- WHEN `calculateTimerLevel` is called
- THEN it MUST return `"amateur"`

#### Scenario: 8 rounds classifies as pro (lower boundary)

- GIVEN a config with `rounds: 8`
- WHEN `calculateTimerLevel` is called
- THEN it MUST return `"pro"`

#### Scenario: 12 rounds classifies as pro (upper boundary)

- GIVEN a config with `rounds: 12`
- WHEN `calculateTimerLevel` is called
- THEN it MUST return `"pro"`

#### Scenario: 13 rounds classifies as elite (lower boundary)

- GIVEN a config with `rounds: 13`
- WHEN `calculateTimerLevel` is called
- THEN it MUST return `"elite"`

#### Scenario: Non-positive rounds still classify defensively (calculateTimerLevel only)

- GIVEN a config with `rounds: 0` or a negative value
- WHEN `calculateTimerLevel` is called directly with it
- THEN it MUST return `"amateur"` as a defensive default, and MUST NOT throw

This is a narrow defensive-default guarantee for `calculateTimerLevel` itself,
called out separately from `validateTimerConfiguration` below. In practice,
callers are expected to validate input via `validateTimerConfiguration` before
it reaches `calculateTimerLevel`; this scenario only documents what
`calculateTimerLevel` does if called with unvalidated data directly.

### Requirement: validateTimerConfiguration rejects non-positive input

The system MUST expose `validateTimerConfiguration(input: TimerConfiguration):
TimerConfiguration | InvalidTimerConfiguration`. It MUST reject (return
`InvalidTimerConfiguration`, never throw) when `rounds <= 0`, OR
`roundDuration <= 0`, OR `restDuration <= 0`. When all three are positive, it
MUST return the input unchanged.

`InvalidTimerConfiguration` MUST follow the existing `src/domain/errors/auth-errors.ts`
functional pattern: `interface InvalidTimerConfiguration extends Error { readonly
_tag: "InvalidTimerConfiguration" }` plus a factory function
`invalidTimerConfiguration(message?: string): InvalidTimerConfiguration`.

#### Scenario: Zero rounds is rejected

- GIVEN a `TimerConfiguration` with `rounds: 0`
- WHEN `validateTimerConfiguration` is called
- THEN it MUST return an `InvalidTimerConfiguration` (not throw)

#### Scenario: Negative rounds is rejected

- GIVEN a `TimerConfiguration` with `rounds: -1`
- WHEN `validateTimerConfiguration` is called
- THEN it MUST return an `InvalidTimerConfiguration` (not throw)

#### Scenario: Zero or negative roundDuration is rejected

- GIVEN a `TimerConfiguration` with `roundDuration: 0` and otherwise valid fields
- WHEN `validateTimerConfiguration` is called
- THEN it MUST return an `InvalidTimerConfiguration` (not throw)

#### Scenario: Zero or negative restDuration is rejected

- GIVEN a `TimerConfiguration` with `restDuration: 0` and otherwise valid fields
- WHEN `validateTimerConfiguration` is called
- THEN it MUST return an `InvalidTimerConfiguration` (not throw)

#### Scenario: Valid configuration passes through unchanged

- GIVEN a `TimerConfiguration` with `rounds`, `roundDuration`, and
  `restDuration` all greater than 0
- WHEN `validateTimerConfiguration` is called
- THEN it MUST return the same `TimerConfiguration`, not an error

### Requirement: Domain layer purity

Code under `src/domain/timer-configuration/` and the new
`InvalidTimerConfiguration`/`validateTimerConfiguration` error module under
`src/domain/errors/` MUST NOT use classes and MUST NOT import React, Next.js,
Zod, fetch, or any other framework/runtime dependency.

#### Scenario: No framework imports

- GIVEN `src/domain/timer-configuration/timer-configuration.model.ts` and the
  new timer-configuration error module
- WHEN their imports are inspected
- THEN they MUST import only TypeScript language constructs, no framework or
  runtime library

#### Scenario: No classes

- GIVEN any construct exported from `src/domain/timer-configuration/` or the
  new timer-configuration error module
- WHEN its declaration is inspected
- THEN it MUST be a plain interface, type alias, or function — never a
  `class`

# Tasks: TimerConfiguration domain entity + level calculation (Issue #17)

## Review Workload Forecast

| Field                   | Value                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Estimated changed lines | ~180-220 (2 source modules ~45 lines, 1 builder ~15 lines, 2 test files ~140 lines) |
| 400-line budget risk    | Low                                                                                 |
| Chained PRs recommended | No                                                                                  |
| Suggested split         | Single PR                                                                           |
| Delivery strategy       | single-pr                                                                           |
| Chain strategy          | size-exception                                                                      |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                                                               | Likely PR | Notes                                                                                                   |
| ---- | ---------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| 1    | Full domain-only slice (builder + both model/error pairs, RED→GREEN, verification) | PR 1      | Single PR; base = feat/17-timer-configuration-domain onto main. No chaining needed — well under budget. |

## Phase 1: Foundation — Test-Data Builder

- [x] 1.1 Create `src/domain/timer-configuration/__builders__/timer-configuration.builder.ts` exporting `buildTimerConfiguration(overrides?: Partial<TimerConfiguration>)` with defaults (`rounds: 8, roundDuration: 180, restDuration: 60, warnBeforeEnd: true, bellSound: true, name: "Standard Session"`) and shallow override spread. Untested per AGENTS.md (data builder), only exercised via the test files in Phases 2-3.
  - Note: builder references the `TimerConfiguration` type from Phase 2.1, but since interfaces are erased at compile time this file can be authored first; it will type-check once 2.1 lands. Author it now so RED tests in 2.2/3.2 can import it immediately.

## Phase 2: TimerConfiguration model — RED → GREEN

- [x] 2.1 (RED) Write `src/domain/timer-configuration/__tests__/timer-configuration.model.test.ts` with failing tests for `calculateTimerLevel`, using `buildTimerConfiguration` for input construction:
  - `describe("calculateTimerLevel")`
  - `it("should classify 7 rounds as amateur")` — upper boundary
  - `it("should classify 8 rounds as pro")` — lower boundary
  - `it("should classify 12 rounds as pro")` — upper boundary
  - `it("should classify 13 rounds as elite")` — lower boundary
  - `it("should default to amateur when rounds is non-positive")` — `rounds: 0` and/or negative, must not throw
- [x] 2.2 (GREEN) Create `src/domain/timer-configuration/timer-configuration.model.ts` exporting the `TimerConfiguration` interface (`name`, `rounds`, `roundDuration`, `restDuration`, `warnBeforeEnd`, `bellSound` — no `level` field), the `TimerLevel` union (`"amateur" | "pro" | "elite"`), and `calculateTimerLevel(config: Pick<TimerConfiguration, "rounds" | "roundDuration" | "restDuration">): TimerLevel` per the design's interface contract. Run `npm run test` to confirm 2.1 passes.

## Phase 3: validateTimerConfiguration errors — RED → GREEN

- [x] 3.1 (RED) Write `src/domain/errors/__tests__/timer-configuration-errors.test.ts` with failing tests, using `buildTimerConfiguration` for a valid base config and per-test field overrides:
  - `describe("validateTimerConfiguration")`
  - `it("should reject a configuration with rounds <= 0")`
  - `it("should reject a configuration with roundDuration <= 0")`
  - `it("should reject a configuration with restDuration <= 0")`
  - `it("should return the input unchanged when all fields are valid")`
- [x] 3.2 (GREEN) Create `src/domain/errors/timer-configuration-errors.ts` exporting `InvalidTimerConfiguration` (`interface ... extends Error { readonly _tag: "InvalidTimerConfiguration" }`), `invalidTimerConfiguration(message?: string)` factory, and `validateTimerConfiguration(input: TimerConfiguration): TimerConfiguration | InvalidTimerConfiguration` mirroring `src/domain/errors/auth-errors.ts`. Run `npm run test` to confirm 3.1 passes.

## Phase 4: Verification

- [x] 4.1 Run `npm run lint` — no violations in the 5 new files.
- [x] 4.2 Run `npx tsc --noEmit` — no type errors.
- [x] 4.3 Run `npm run test` — full suite green, including both new test files (9 new tests total).
- [x] 4.4 Confirm no framework imports and no `class` declarations in `src/domain/timer-configuration/` or `src/domain/errors/timer-configuration-errors.ts` (spec's "Domain layer purity" requirement).

# Design: TimerConfiguration domain entity + level calculation (Issue #17)

## Technical Approach

Ship one framework-free domain module: `src/domain/timer-configuration/timer-configuration.model.ts` exporting the `TimerConfiguration` interface, the `TimerLevel` union, and the pure `calculateTimerLevel` function. Level is derived on demand, never stored (locked decision). A test-data builder lives beside it in `__builders__/`; `calculateTimerLevel` and `validateTimerConfiguration` are tested (`__tests__/`). Zero imports — pure TypeScript, no classes, matching the existing flat `session.model.ts`/`user.model.ts` shape but promoted to a folder because this is the first domain piece with behavior.

A second, separate module — `src/domain/errors/timer-configuration-errors.ts` — exports `InvalidTimerConfiguration` and `invalidTimerConfiguration()`, plus `validateTimerConfiguration()` (see new decision below), added after the user required that non-positive `rounds`/`roundDuration`/`restDuration` must be rejected rather than silently accepted.

## Architecture Decisions

### Decision: No factory, `level` not stored

**Choice**: `TimerConfiguration` is a plain structurally-typed interface; `calculateTimerLevel` is a standalone function.
**Alternatives considered**: `createTimerConfiguration` factory + stored `level` field.
**Rationale**: No classes allowed (AGENTS.md), so a factory enforces no invariant — callers can build the literal directly. Storing a derived value invites drift. Both rejected by the user after design discussion.

### Decision: v1 heuristic keys on `rounds` only

**Choice**: Signature takes `Pick<TimerConfiguration, "rounds" | "roundDuration" | "restDuration">` but branches on `rounds` alone.
**Alternatives considered**: Branch on total workout time now.
**Rationale**: Locked thresholds are round-based (amateur ≤7, pro 8–12, elite ≥13). Keeping the two durations in the signature lets a future refinement use them without a call-site rewrite; `roundDuration`/`restDuration` are intentionally unused in v1.

### Decision: `calculateTimerLevel` is a total function (no guards) — defensive default only

**Choice**: Classify with `rounds <= 7 → amateur`, `rounds <= 12 → pro`, else `elite`. Never throws, even for non-positive `rounds` (defaults to `amateur`).
**Alternatives considered**: Guard `rounds <= 0` and throw / return a domain error directly inside `calculateTimerLevel`.
**Rationale**: `calculateTimerLevel` stays a pure classifier with no rejection responsibility — that responsibility now belongs entirely to `validateTimerConfiguration` (see next decision), which runs before a `TimerConfiguration` is used at all. Keeping `calculateTimerLevel` total means it never needs to be called on already-invalid data through the normal flow, but if it ever is (e.g. called directly, bypassing validation), it still can't throw or misbehave.

### Decision: Add `validateTimerConfiguration` domain validation

**Choice**: `validateTimerConfiguration(input: TimerConfiguration): TimerConfiguration | InvalidTimerConfiguration`, in a new `src/domain/errors/timer-configuration-errors.ts` module, mirroring the existing `auth-errors.ts` pattern (`interface InvalidTimerConfiguration extends Error { readonly _tag: "InvalidTimerConfiguration" }` + `invalidTimerConfiguration(message?)` factory). Rejects when `rounds <= 0` OR `roundDuration <= 0` OR `restDuration <= 0`; returns the input unchanged otherwise. Never throws.
**Alternatives considered**: (a) No validation at all, matching the flat/untested `session.model.ts`/`user.model.ts` precedent. (b) Reviving the earlier-rejected `createTimerConfiguration` factory to also carry validation.
**Rationale**: The user explicitly required non-positive rounds/durations to be un-creatable — real input validation at a trust boundary, which is a different concern from the earlier rejected factory (whose only job was deriving/storing `level`, a value that didn't need to exist as state at all). The "interfaces have no encapsulation, so a factory enforces nothing" argument that killed the level-deriving factory does NOT apply here: this function's value isn't compiler-enforced exclusivity, it's being the single, tested place validation logic lives — matching the project's existing errors-as-values convention (`AuthError`) instead of duplicating `<= 0` checks at every future call site (use-cases, UI). Named `validateTimerConfiguration`, not `createTimerConfiguration`, to avoid resurrecting the rejected name/semantics.

### Decision: Defer `openspec/specs/domain-structure/spec.md`

**Choice**: Do NOT create a domain-structure main spec in this change.
**Alternatives considered**: Formalize the domain folder-per-piece convention now.
**Rationale**: A convention spec generalized from a single instance is premature. The two existing domain models stay flat and don't move. AGENTS.md already binds folder-per-piece project-wide, so nothing is unenforced without the spec. Revisit when a SECOND domain entity folder is added — that is when a real pattern (not a one-off) exists to codify. The sdd-spec phase still emits the behavioral delta for `calculateTimerLevel`.

## Data Flow

Pure, synchronous, no I/O:

    caller (future UI) ──rounds/durations──▶ calculateTimerLevel ──▶ TimerLevel

Nothing constructs or caches a level; each call recomputes.

## File Changes

| File                                                                         | Action | Description                                                                                                      |
| ---------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/domain/timer-configuration/timer-configuration.model.ts`                | Create | `TimerConfiguration`, `TimerLevel`, `calculateTimerLevel`                                                        |
| `src/domain/errors/timer-configuration-errors.ts`                            | Create | `InvalidTimerConfiguration`, `invalidTimerConfiguration`, `validateTimerConfiguration`                           |
| `src/domain/timer-configuration/__tests__/timer-configuration.model.test.ts` | Create | Boundary tests for `calculateTimerLevel`                                                                         |
| `src/domain/errors/__tests__/timer-configuration-errors.test.ts`             | Create | Rejection tests for `validateTimerConfiguration` (rounds/roundDuration/restDuration ≤ 0, plus valid passthrough) |
| `src/domain/timer-configuration/__builders__/timer-configuration.builder.ts` | Create | Test-data builder, untested                                                                                      |

## Interfaces / Contracts

```ts
export type TimerLevel = "amateur" | "pro" | "elite";

export interface TimerConfiguration {
  name: string;
  rounds: number;
  roundDuration: number; // seconds
  restDuration: number; // seconds
  warnBeforeEnd: boolean;
  bellSound: boolean;
}

// roundDuration/restDuration unused in v1; kept for future refinement.
export function calculateTimerLevel(
  config: Pick<TimerConfiguration, "rounds" | "roundDuration" | "restDuration">
): TimerLevel {
  const { rounds } = config;
  if (rounds <= 7) return "amateur";
  if (rounds <= 12) return "pro";
  return "elite";
}
```

`src/domain/errors/timer-configuration-errors.ts` (mirrors `auth-errors.ts`):

```ts
export interface InvalidTimerConfiguration extends Error {
  readonly _tag: "InvalidTimerConfiguration";
}

export function invalidTimerConfiguration(
  message = "Invalid timer configuration"
): InvalidTimerConfiguration {
  return Object.assign(new Error(message), {
    _tag: "InvalidTimerConfiguration" as const,
  });
}

export function validateTimerConfiguration(
  input: TimerConfiguration
): TimerConfiguration | InvalidTimerConfiguration {
  if (
    input.rounds <= 0 ||
    input.roundDuration <= 0 ||
    input.restDuration <= 0
  ) {
    return invalidTimerConfiguration(
      "rounds, roundDuration, and restDuration must be greater than 0"
    );
  }
  return input;
}
```

Builder shape — base valid config with sensible defaults + shallow override:

```ts
export function buildTimerConfiguration(
  overrides: Partial<TimerConfiguration> = {}
): TimerConfiguration {
  return {
    name: "Standard Session",
    rounds: 8,
    roundDuration: 180,
    restDuration: 60,
    warnBeforeEnd: true,
    bellSound: true,
    ...overrides,
  };
}
```

## Testing Strategy

| Layer         | What to Test                                                                                                  | Approach                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Domain (unit) | `calculateTimerLevel` boundaries: 7→amateur, 8→pro, 12→pro, 13→elite                                          | Vitest `node` env, no mocks, builder for inputs                                        |
| Domain (edge) | `calculateTimerLevel` with non-positive `rounds` (e.g. 0) → amateur (defensive default, documented)           | Same                                                                                   |
| Domain (unit) | `validateTimerConfiguration` rejects `rounds ≤ 0`, `roundDuration ≤ 0`, `restDuration ≤ 0` (3 separate tests) | Vitest `node` env, no mocks, builder for base valid input, override one field per test |
| Domain (unit) | `validateTimerConfiguration` returns input unchanged when all fields valid                                    | Same                                                                                   |

- **Strict TDD**: write failing tests first (level boundaries, then validation rejections), then the implementation. Each `it` starts with `should` and asserts one behavior.
- The interface and builder get NO dedicated tests (data shape + untested builder per AGENTS.md); the builder is exercised only through the `calculateTimerLevel`/`validateTimerConfiguration` tests.
- No `jsdom`, no timers, no network — pure domain modules need none.

## Migration / Rollout

No migration. New isolated folder; no other layer imports it yet. Rollback = delete the folder.

## Open Questions

- None blocking. `domain-structure` spec deliberately deferred (see decision above).
- Resolved during design/spec revision: `rounds ≤ 0` is no longer an open question — `validateTimerConfiguration` rejects it (and `roundDuration`/`restDuration` ≤ 0) outright; `calculateTimerLevel` keeps a defensive `amateur` default only for direct/bypassing calls.

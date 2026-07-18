# Proposal: TimerConfiguration domain entity + level calculation (Issue #17)

## Intent

The timer feature (rounds/rest/warn/bell for boxing sessions) has no domain model yet.
This is the FIRST domain entity with behavior (derived `level`) and the first sequenced
slice of the timer feature — application, infra, and UI issues depend on it. Ship the pure
domain core first so business rules (level classification) live in framework-free, tested
code before any adapter or component can tempt logic inline.

## Scope

### In Scope

- `src/domain/timer-configuration/timer-configuration.model.ts`: `TimerConfiguration` interface, `TimerLevel` type, `calculateTimerLevel` pure function.
- `src/domain/errors/timer-configuration-errors.ts` (or appended to an existing domain-errors file — design phase to confirm exact location): `InvalidTimerConfiguration` domain error + `validateTimerConfiguration` function, mirroring the `auth-errors.ts` functional pattern.
- `__tests__/timer-configuration.model.test.ts`: unit tests for `calculateTimerLevel` (amateur/pro/elite boundaries) AND `validateTimerConfiguration` (rejects `rounds`/`roundDuration`/`restDuration` ≤ 0). The `TimerConfiguration` interface itself gets no dedicated test (data-shape only, like `user.model.ts`).
- `__builders__/timer-configuration.builder.ts`: reusable test-data builder (itself untested per AGENTS.md).

### Out of Scope

- Any `application/`, `infraestructure/`, or `ui/` work — those are separate sequenced issues (#application-crud, #infra-adapters, #infra-migration, #ui-management, #ui-engine).
- Migrating existing `session.model.ts`/`user.model.ts` to the folder-per-piece shape.
- Persistence, validation (Zod), and CRUD.

## Capabilities

### New Capabilities

- None decided here. This change MAY warrant a new `openspec/specs/domain-structure/spec.md` to formalize the domain folder-per-piece + `__builders__/` convention (none exists today, unlike `application-structure`/`ui-structure`). Flagging for the spec phase to decide — do not force it in this proposal.

### Modified Capabilities

- None.

## Approach

Public shape (units in seconds, confirmed — UI layer converts to minutes for display, out of scope here):

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

export function calculateTimerLevel(
  config: Pick<TimerConfiguration, "rounds" | "roundDuration" | "restDuration">
): TimerLevel;

export interface InvalidTimerConfiguration extends Error {
  readonly _tag: "InvalidTimerConfiguration";
}

export function invalidTimerConfiguration(
  message?: string
): InvalidTimerConfiguration;

export function validateTimerConfiguration(
  input: TimerConfiguration
): TimerConfiguration | InvalidTimerConfiguration;
```

No classes, zero framework imports. `level` is NOT a stored field — it is 100% derivable from
`rounds`/`roundDuration`/`restDuration`, so storing it would be redundant state that could drift
out of sync. `calculateTimerLevel` is called on demand wherever the level is needed (e.g.
displaying it in the "Cronómetros" screen); nothing constructs or caches it. (Revised after user
pushback — an earlier draft of this proposal included a `createTimerConfiguration` factory whose
only job was deriving/storing `level`; removed as unnecessary indirection, since a plain
interface has no encapsulation and such a factory couldn't have enforced anything anyway.)

**`validateTimerConfiguration` is a different, later addition** — not a resurrection of the
rejected factory. Its job is genuine input validation at a trust boundary (rounds/durations must
be positive), not deriving a value that didn't need storing. It follows the existing
`auth-errors.ts` functional-error pattern: returns either the valid input unchanged or a typed
`InvalidTimerConfiguration` error object — no throwing, no class, consistent with how `AuthError`
is modeled. `rounds ≤ 0`, `roundDuration ≤ 0`, or `restDuration ≤ 0` are all rejected (user
confirmed all three, not just `rounds`).

**Level thresholds (confirmed by user):** classify by round count.

| Level     | Rounds |
| --------- | ------ |
| `amateur` | ≤ 7    |
| `pro`     | 8–12   |
| `elite`   | ≥ 13   |

`calculateTimerLevel` takes all three fields (per locked decision) so duration can refine the
default later, but the v1 heuristic keys on `rounds` alone for clarity. Round-boundary tests:
7→amateur, 8→pro, 12→pro, 13→elite. `calculateTimerLevel` stays a total function (never throws,
`rounds ≤ 0` still classifies as `amateur` as a defensive default) — it is a separate concern
from `validateTimerConfiguration`, which is the actual rejection gate for invalid input before a
`TimerConfiguration` is used at all.

## Affected Areas

| Area                               | Impact            | Description                                                |
| ---------------------------------- | ----------------- | ---------------------------------------------------------- |
| `src/domain/timer-configuration/`  | New               | model + level fn, `__tests__/`, `__builders__/`            |
| `src/domain/errors/`               | New (or extended) | `InvalidTimerConfiguration` + `validateTimerConfiguration` |
| `openspec/specs/domain-structure/` | Possible New      | formalize domain folder convention (spec-phase call)       |

## Risks

| Risk                                                                                                | Likelihood | Mitigation                                                                     |
| --------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Level thresholds wrong for product intent                                                           | Med        | Presented as explicit adjustable proposal; single pure fn is trivial to retune |
| Folder shape sets precedent for follow-up issues                                                    | Med        | Adopt already-codified folder-per-piece; flag optional `domain-structure` spec |
| `restDuration` unused by v1 `calculateTimerLevel` heuristic                                         | Low        | Kept in signature to honor locked decision; no rework to add it later          |
| `validateTimerConfiguration` return-type union requires callers to narrow (`_tag` check) before use | Low        | Same pattern already used for `AuthError`; consistent with codebase convention |

## Rollback Plan

Delete `src/domain/timer-configuration/`. No other layer imports it yet (domain-only slice), so removal is isolated and safe.

## Dependencies

- None external. Precedes all other timer issues.

## Success Criteria

- [ ] `TimerConfiguration` interface exists under `src/domain/timer-configuration/`, no `level` field, no classes, no framework imports.
- [ ] `calculateTimerLevel` is a standalone pure function, never stored/cached on the entity.
- [ ] `calculateTimerLevel` covered by boundary tests (amateur/pro/elite) that pass in `node` env with no mocks.
- [ ] `validateTimerConfiguration` rejects `rounds ≤ 0`, `roundDuration ≤ 0`, and `restDuration ≤ 0`, each with a dedicated test, returning `InvalidTimerConfiguration` (no throw).
- [ ] `__builders__/` builder used by the tests; not tested itself.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` all pass.

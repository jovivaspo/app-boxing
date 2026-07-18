# Exploration: TimerConfigurationRepository port + CRUD use cases (Issue #18)

## Current State

`TimerConfiguration` (`src/domain/timer-configuration/timer-configuration.model.ts`, landed on this branch via #17, commits 934090a/6b1825e) is:

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
  config: Pick<TimerConfiguration, "rounds">
): TimerLevel;
```

**Critical finding: `TimerConfiguration` has NO `id` field.** It is a plain, identity-less interface (locked decision from #17: no factory, no stored/derived state beyond the 6 listed fields). This is the single biggest open question for #18 — a CRUD repository fundamentally needs identity for `update`/`delete`/single-`get`, but the domain entity as shipped has none.

Domain error module `src/domain/errors/timer-configuration-errors.ts` exports `InvalidTimerConfiguration` (`_tag`-discriminated, `extends Error`) and `validateTimerConfiguration(input): TimerConfiguration` which **throws** `invalidTimerConfiguration()` when `rounds <= 0 || roundDuration <= 0 || restDuration <= 0`, else returns input unchanged. No "not found" or "already exists" domain error exists yet — would need to be added (mirroring this same throw-based `_tag` pattern) for update/delete-on-missing-id cases, likely in the same `timer-configuration-errors.ts` file or a new one.

Test builder: `src/domain/timer-configuration/__builders__/timer-configuration.builder.ts` — `buildTimerConfiguration(overrides = {}): TimerConfiguration` returns a valid default + shallow override. No id in the builder either (consistent with the entity).

## Existing Application-Layer Conventions

**Ports** (`src/application/ports/*.port.ts`) — plain `interface` per port, no factory, JSDoc `@throws` tags referencing domain errors by type-only import path (`{@link}`-style `import("@/domain/errors/...")`), method names are short verbs (`create`, `get`, `clear`, `exchange`, `load`, `renderButton`). No `Repository`-named port exists yet anywhere in the codebase (`grep -ri repository src` → zero hits) — #18 introduces the first one, so there's no in-repo stylistic precedent to mirror beyond the generic port shape above (`SessionPort`, `AuthPort`, `GoogleIdentityPort`).

**Use cases** (`src/application/use-cases/{name}/{name}.ts` + sibling `__tests__/{name}.test.ts`, no barrel `index.ts` — formalized in `openspec/specs/application-structure/spec.md`):

- Shape: `export function useCaseName(deps: DepsInterface) { return function execute(args): ReturnType { ... }; }` — a deps-injection factory returning a bound `execute` function. `Deps` interface is declared inline in the same file (e.g. `SignInWithGoogleDeps { auth: AuthPort; session: SessionPort }`).
- Validation-then-delegate pattern: `signInWithGoogle` validates raw input before calling the port — but for #18, domain-level validation (`validateTimerConfiguration`) already exists and throws `InvalidTimerConfiguration`, so `create`/`update` use cases should likely call `validateTimerConfiguration(input)` before delegating to the port, not reimplement checks.
- Simple pass-through use cases exist too (`getCurrentSession`, `signOut` just call the port directly, no extra logic) — `list-timer-configurations` and `delete-timer-configuration` are likely this shape.

**Tests**: no mocking library/framework beyond `vi.fn()` — ports are faked with local `make{PortName}(overrides?)` factory helper functions returning an object literal with `vi.fn().mockResolvedValue(...)` per method, `overrides` spread last so a per-test override wins. No `__mocks__/` folder used for ports in the auth slice (helpers live inline in the test file). Assertions check the port method was called with expected args, the use case propagates the port's rejection, and that side-effecting calls did NOT happen on the invalid-input early-return path.

## No existing repository/port precedent to mirror

Grepped `src` for `Repository`/`repository` — zero matches. #18 is the first CRUD-shaped port. Closest analogous precedent: `SessionPort` (create/get/clear) — same shape, different domain.

## Approaches

1. **Single `TimerConfigurationRepository` port with a synthesized `id: string`, entity kept identity-less** — port signatures: `create(config: TimerConfiguration): Promise<TimerConfiguration & { id: string }>` (or a separate `StoredTimerConfiguration` type), `list(): Promise<StoredTimerConfiguration[]>`, `update(id: string, config: TimerConfiguration): Promise<StoredTimerConfiguration>`, `delete(id: string): Promise<void>`.
   - Pros: keeps `TimerConfiguration` domain entity untouched; `id` is explicitly a persistence-layer concern, fitting Hexagonal (adapters assign ids), not a domain concern.
   - Cons: introduces a second type not in the domain layer — needs a decision on where it lives.
   - Effort: Low-Medium.

2. **Add `id: string` directly to `TimerConfiguration` in domain, reopening #17's entity shape** — `create` takes `Omit<TimerConfiguration, "id">`, everything else takes/returns full `TimerConfiguration` including `id`.
   - Pros: one type everywhere, simpler signatures.
   - Cons: reopens a just-merged, PR-reviewed domain entity (#17) for a change explicitly scoped to "Application" per the issue's Affected Area — scope creep into a closed dependency. Would touch the `__builders__` builder and existing domain tests too.
   - Effort: Medium.

3. **Repository port id type: plain `string` vs. branded string** — independent sub-decision from 1 vs 2. Recommend plain `string`, matching the only existing id precedent (`User.id` in `src/domain/user.model.ts`). No branded-id precedent exists in this codebase.
   - Effort: trivial either way.

## Recommendation

Approach 1 (port-level `id`, domain entity stays exactly as #17 shipped it) + plain `string` id. Keeps #18 scoped to "Application", avoids relitigating #17's just-reviewed domain shape, matches Hexagonal principle that persistence identity is an infrastructure/application concern layered on top of a domain entity, not baked into it.

The design/spec phase must explicitly confirm:
(a) whether the intersected/stored shape is called `StoredTimerConfiguration` or something else, and where it lives (`src/application/ports/timer-configuration-repository.port.ts`, alongside the port, since it's port-facing, not a domain concept);
(b) the exact 4 method signatures;
(c) whether `update` takes `(id, config)` as two args or one `{ id, ...config }` object;
(d) a new "not found" domain error (e.g. `timerConfigurationNotFound(id)`), added to `src/domain/errors/timer-configuration-errors.ts` alongside `InvalidTimerConfiguration`, thrown by `update`/`delete` use cases (or the port itself) when the id doesn't resolve — needs a decision on who throws it;
(e) `create`/`update` use cases should call `validateTimerConfiguration` (already exists) before delegating to the port — confirm this reuse rather than reimplementing validation.

## Risks

- **No `id` on `TimerConfiguration`** is the central open design question — must be resolved explicitly in proposal/design, not silently assumed, since it changes every one of the 4 use-case signatures and the port shape.
- **No existing `Repository`-named port or CRUD-shaped port precedent** in this codebase — the design phase is setting a new convention (naming, file location), not following one; get it right since future adapter/UI work will build on it.
- **Missing "not found" domain error** — `update`/`delete` on a missing id needs a typed error; currently only `InvalidTimerConfiguration` exists (input-shape validation, not a lookup-failure case). Must decide whether use case or port throws it, and whether it belongs in `timer-configuration-errors.ts` or a new file.
- **Scope creep risk into #17**: any temptation to add `id` to the domain entity itself reopens a dependency that was just merged/reviewed on this branch — should be flagged explicitly if the design phase considers it, not defaulted to.
- **`create`/`update` and domain validation ordering**: must decide whether `validateTimerConfiguration` is called inside the use case (recommended) or left to the port/adapter (would duplicate validation logic downstream).

## Ready for Proposal

Yes — architecture and conventions are well understood. The proposal/spec phase MUST explicitly decide and record: (1) id strategy (port-level intersection type vs. reopening #17's entity — recommend port-level), (2) exact port method signatures, (3) a "not found" domain error and who throws it, (4) reuse of `validateTimerConfiguration` inside `create`/`update` use cases, (5) whether the stored-shape type lives beside the port file or in its own file.

# Exploration: TimerConfiguration domain entity + level calculation (Issue #17)

## Current State

`src/domain/` is greenfield for entities with behavior. It currently has exactly two model files, both flat (no per-entity folder, no factory, no tests):

- `src/domain/session.model.ts` — plain `interface Session { token; user }`.
- `src/domain/user.model.ts` — plain `interface User { id; name; email; role; pictureUrl; createdAt }`.
  Both are anemic DTO-shaped interfaces, populated by infra mappers, never constructed via a domain factory.

The only domain code with real behavior/tests is `src/domain/errors/auth-errors.ts` + `src/domain/errors/__tests__/auth-errors.test.ts`:

- Pattern: `interface Foo extends Error { readonly _tag: "Foo" }` + `function foo(message?): Foo { return Object.assign(new Error(message), { _tag: "Foo" as const }) }`.
- No classes anywhere (confirmed project-wide for domain/errors and infra adapters — e.g. `createBackendAuthAdapter(): AuthPort` factory function style in `src/infraestructure/auth/backend-auth.adapter.ts`).
- Tests: `describe` per factory function, AAA structure, no mocks (pure).

No entity in the domain layer currently has: a constructing factory function, derived/computed fields, or an associated `__tests__/` folder next to a `.model.ts` file. `session.model.ts` and `user.model.ts` have zero tests. **TimerConfiguration is the first domain entity in this codebase with real behavior (level calculation) and the first `.model.ts` to need a `__tests__/` sibling.**

There is no `openspec/specs/domain-structure/spec.md` — only `application-structure`, `infraestructure-structure`, and `ui-structure` specs exist. Domain folder/naming conventions are not yet formalized in a spec; only the two ad-hoc precedents above exist.

No `__builders__/` (or `__builder__/`) folder exists anywhere in `src/` today — confirmed via full glob. This is a brand-new pattern for the codebase, not a reuse of an existing convention. Existing use-case tests (`sign-in-with-google.test.ts`, `get-current-session.test.ts`) build fake data with local `makeAuth()`/`makeSession()`-style factory helper functions declared inline in the test file, or plain inline object literals (`fakeSession`) — there is no extracted, shared, reusable builder module anywhere to mirror. `AGENTS.md` documents `__builders__/` (plural) as the project-wide convention for test data builders, alongside `__mocks__/`, both described as sitting beside `__tests__/`, "opt-in — only add them when a piece actually needs a mock or a builder."

No timer/round/level/amateur/elite domain concept exists anywhere in `src/` (confirmed via grep) — this is fully greenfield, no code or types to reuse or collide with.

## Affected Areas

- `src/domain/` — net-new file(s) for the `TimerConfiguration` entity/factory and the level-calculation pure function. Exact file/folder shape is a design-phase decision (see Approaches).
- `src/domain/errors/auth-errors.ts` — style reference only (functional factory pattern, `_tag` discriminant), not modified. No domain error is obviously needed for TimerConfiguration unless design phase decides invalid params (e.g. negative rounds) should reject with a typed domain error rather than being unrepresentable/clamped.
- `openspec/specs/` — no `domain-structure` spec exists; this change may be the first to formalize a domain entity/folder convention, similar to how `use-case-folder-pattern` and `infra-actions-folder-pattern` formalized their layers.
- Nothing in `application/`, `infraestructure/`, or `ui/` is affected by this issue — it is explicitly scoped to domain only, sequenced before the application/infra/UI issues for this feature.

## Approaches

1. **Flat file, mirroring `session.model.ts`/`user.model.ts`** — `src/domain/timer-configuration.model.ts` + `src/domain/__tests__/timer-configuration.model.test.ts` + `src/domain/__builders__/timer-configuration.builder.ts` (or `__builder__/` per the issue's literal wording — flag, don't silently resolve).
   - Pros: Consistent with the only two existing domain model files today; simplest, no new folder-per-piece precedent needed.
   - Cons: `src/domain/__tests__/` would become a shared dumping ground as more domain models are added later (application-crud, etc.); doesn't match the folder-per-piece pattern AGENTS.md already mandates for components/actions/use-cases.
   - Effort: Low.

2. **Dedicated kebab-case folder**, mirroring the use-case/action/component pattern — `src/domain/timer-configuration/timer-configuration.model.ts` + sibling `__tests__/` + `__builders__/`.
   - Pros: Consistent with the folder-per-piece convention already codified in AGENTS.md for three other kinds of pieces; scales cleanly as more domain entities are added for this feature (and others); keeps builder/tests colocated with just this entity.
   - Cons: No existing domain precedent for this shape yet (would be a new formalized convention, likely warranting its own `openspec/specs/domain-structure/spec.md` the way `use-case-folder-pattern` and `infra-actions-folder-pattern` did for their layers); the two existing domain models (`session.model.ts`, `user.model.ts`) would look inconsistent unless also migrated (out of scope for this issue).
   - Effort: Low-Medium (mostly a decision, not code volume).

3. **Level as a stored field set by the factory caller, with `calculateTimerLevel()` as a separate advisory/UI-facing helper (not invariant-enforcing)** vs. **Level as a derived field the factory always computes internally from `rounds`/`roundDuration`/`restDuration`, never settable directly** — this is a real architectural fork, independent of the file-layout question above.
   - Approach 3a (settable + advisory function): Pros: simpler function signature, decouples "what the UI shows" from "what the entity stores," matches the issue's literal shape (`level` is a field). Cons: allows constructing a `TimerConfiguration` whose `level` disagrees with what the params imply — an anemic-model / invariant-violation risk flagged directly by the Clean/DDD skill's Anti-Patterns table ("Anemic Domain Model" — behavior should live in the entity, not be optional).
   - Approach 3b (always-derived): Pros: entity is always internally consistent; matches the skill's "move behavior into entities" guidance; the pure calculation function becomes the single source of truth for level, testable in isolation with clear amateur/pro/elite boundary tests. Cons: removes the ability for a user to override level independent of the numeric params, if the product actually wants that (unclear from the issue — level display for "Cronómetros" screen may be informational only, or may double as a preset selector that also sets rounds/durations, in which case direction of dependency could invert).
   - Effort: Low either way; this is a design decision, not a size difference.

## Recommendation

Approach 2 (dedicated folder) for consistency with the project's already-codified folder-per-piece convention, paired with Approach 3b (level always derived by the factory, computed via the pure function) to avoid introducing the first anemic/invariant-violating domain model in the codebase. Both are design-phase decisions to confirm with the user, not something to silently pick during exploration.

## Risks

- **Ambiguous acceptance criterion**: "The new entity does not required tests" directly contradicts the first criterion ("entity/factory added with tests in `__tests__/`") and the fourth ("Level calculation is a pure function with unit tests"). Likely a typo meaning "does not need tests beyond the factory/level function," but this must be confirmed explicitly in the proposal/spec phase, not silently resolved.
- **Naming discrepancy**: issue says `__builder__/` (singular); `AGENTS.md` documents `__builders__/` (plural) as the project-wide convention. Must be confirmed/resolved explicitly — recommend following `AGENTS.md`'s plural form for consistency, but this is a decision for the user/design phase, not implied consent to override the issue text.
- **No existing domain-folder precedent**: unlike use-cases/actions/components, domain models have no formalized folder convention yet — whichever shape is picked here likely becomes the template for the follow-up issues (#application-crud, #infra-adapters, #ui-management, #ui-engine), raising the stakes of this decision beyond just this one entity.
- **Level thresholds are TBD** (explicitly deferred by the issue to design phase) — amateur/pro/elite boundaries based on rounds/duration are a product decision, not an engineering one; needs domain input (e.g. real boxing round conventions) before the pure function can be written meaningfully, not just structurally stubbed.
- **Derived-vs-settable `level` field** (see Approach 3) changes the factory's public signature and what "valid input" means — should be locked down in design/spec before implementation to avoid rework.

## Ready for Proposal

Yes — enough is understood about existing domain conventions (or lack thereof) to propose a shape. The proposal/spec phase MUST explicitly surface and get a decision on: (1) the "does not required tests" contradiction, (2) `__builder__/` vs `__builders__/` naming, (3) flat file vs dedicated folder, (4) derived vs settable `level`, and (5) actual amateur/pro/elite thresholds — none of these should be silently resolved by an implementer.

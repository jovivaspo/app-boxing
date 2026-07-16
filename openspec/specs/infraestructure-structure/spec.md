# Specification: Infraestructure Structure

## Capability Statement

The infraestructure layer of the application MUST enforce consistent module organization and test co-location patterns. Server Actions and test files for all infrastructure modules (adapters, mappers, etc.) MUST follow kebab-case folder organization with sibling `__tests__/` directories. This ensures maintainability, discoverability, and alignment with Clean Architecture patterns.

Note: `infraestructure/` is the codebase's deliberate spelling (per AGENTS.md) and is preserved verbatim in all references — it is not a typo.

## Requirements

### Requirement: Server Action Module Folder Organization

Each Server Action under `src/infraestructure/actions/` MUST live in its own kebab-case folder containing the action's source file and a sibling `__tests__/` folder holding its test file. No barrel `index.ts` is required or expected for Server Action folders.

#### Scenario: New Server Action added to the codebase

- GIVEN a developer adds a new Server Action under `src/infraestructure/actions/`
- WHEN the Server Action is committed
- THEN it MUST reside in its own kebab-case folder (e.g. `src/infraestructure/actions/{action-name}/{action-name}.action.ts`) with its test under a sibling `__tests__/` folder
- AND it MUST NOT be a flat `.ts` file directly under `actions/`

### Requirement: Infrastructure Test Co-location

Test files for modules under `src/infraestructure/` (adapters, mappers, and any other infrastructure module, not only Server Actions) MUST live in a sibling `__tests__/` folder rather than flat beside the source file. The source module itself does not need to move — only its test.

#### Scenario: Existing adapter/mapper test relocated into compliance

- GIVEN an adapter or mapper module under `src/infraestructure/` (e.g. `auth/`, `auth/mappers/`, `session/`) has a test file sitting flat beside its source
- WHEN the test file is moved
- THEN it MUST land in a sibling `__tests__/` folder
- AND its relative import(s) to the source module MUST be updated to remain valid (e.g. `./x` → `../x`)

#### Scenario: New infrastructure module added to the codebase

- GIVEN a developer adds a new adapter, mapper, or other module under `src/infraestructure/`
- WHEN a test file is added for that module
- THEN the test file MUST be placed in a sibling `__tests__/` folder from the start, not flat beside the source

## Non-Goals

- Does not prescribe behavior, API, or logic changes to adapters, mappers, or Server Actions — those concerns are covered by capability-specific specs (e.g. `session-authentication`).
- Does not cover flat non-shadcn UI components — same audit lineage, deferred to a follow-up specification.
- Does not require renaming legacy third-person test titles to `should...` — deferred to a dedicated naming pass per AGENTS.md.
- Does not require an `index.ts` barrel for Server Action folders — explicitly excluded, consistent with AGENTS.md's Server Action folder pattern.

## Rationale

Clean Architecture depends on clear layer boundaries and consistent file organization. The `src/infraestructure/` layer acts as the bridge between domain/application and external systems. Without consistent folder patterns:

- New developers must hunt for test files across flat hierarchies
- Test maintenance becomes error-prone during refactors
- The asymmetry between application-layer organization (`use-cases/` folders with `__tests__/`) and infrastructure-layer organization (flat test files) signals incomplete architectural discipline

Enforcing kebab-case folders and sibling `__tests__/` directories aligns infrastructure with application-layer patterns, improving discoverability and setting the precedent for future frontend infrastructure modules.

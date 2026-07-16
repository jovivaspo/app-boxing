# Delta for Infraestructure Structure

## Capability Delta Statement

This change is a pure structural refactor: 7 file moves (1 Server Action + 6 test files) into folder-pattern/`__tests__/` compliance, and import-path fixes across 9 references (1 external consumer + 8 internal relative imports). It introduces **no new capability**, modifies **no existing capability's observable behavior**, and removes **no capability**. There is no new user-facing requirement, no changed business rule, and no new or changed scenario for any product-facing spec (e.g. `login-page`, `session-authentication`).

**No behavioral ADDED, MODIFIED, REMOVED, or RENAMED requirements are declared for those product specs by this delta.**

The requirements below are structural/organizational only — they govern source-tree layout, not runtime behavior, public APIs, or any user-observable outcome. They are captured here (rather than omitted entirely) because AGENTS.md already makes these conventions binding project-wide, and this change is the direct follow-up to Issue #8 (`use-case-folder-pattern`), extending the same audit reference from `src/application/` to `src/infraestructure/`. Note: `infraestructure/` is the codebase's deliberate spelling (per AGENTS.md) and is preserved verbatim throughout this spec — it is not a typo.

## ADDED Requirements

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

- No behavior, API, or business-rule change to any adapter, mapper, or Server Action covered by this move — those are covered by their respective product specs (e.g. `session-authentication`), unaffected here.
- Does not cover flat non-shadcn UI components — same audit lineage, deferred to a follow-up issue per the proposal's Out-of-Scope section.
- Does not require renaming legacy third-person test titles to `should...` — deferred to a dedicated naming pass per AGENTS.md.
- Does not require an `index.ts` barrel for Server Action folders — explicitly excluded, consistent with AGENTS.md's Server Action folder pattern.

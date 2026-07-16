# Delta for Application Structure

## Capability Delta Statement

This change is a pure structural refactor: mechanical file moves (3 use cases + 1 domain-error test into per-piece folders), import-path updates across 12 references + 2 JSDoc paths, and a test-quality audit of the 4 relocated test files that found zero non-naming violations. It introduces **no new capability**, modifies **no existing capability's observable behavior**, and removes **no capability**. There is no new user-facing requirement, no changed business rule, and no new or changed scenario for any product-facing spec (e.g. `login-page`, `session-authentication`).

**No behavioral ADDED, MODIFIED, REMOVED, or RENAMED requirements are declared for those product specs by this delta.**

The one requirement below is structural/organizational only — it governs source-tree layout, not runtime behavior, public APIs, or any user-observable outcome. It is captured here (rather than omitted entirely) because AGENTS.md already makes this convention binding project-wide, and this change is the first to formalize it as a spec artifact — giving future audits (e.g. the deferred flat Server Action and flat UI components noted in the proposal's Out-of-Scope section) a concrete reference to check against.

## ADDED Requirements

### Requirement: Use-Case Module Folder Organization

Each use case under `src/application/use-cases/` MUST live in its own kebab-case folder containing the use case's source file and a sibling `__tests__/` folder holding its test file. No barrel `index.ts` is required or expected for use-case folders. Test files for `src/domain/errors/` modules MUST live in a sibling `__tests__/` folder rather than flat beside the source file.

#### Scenario: New use case added to the codebase

- GIVEN a developer adds a new use case under `src/application/use-cases/`
- WHEN the use case is committed
- THEN it MUST reside in its own kebab-case folder (e.g. `src/application/use-cases/{use-case-name}/{use-case-name}.ts`) with its test under a sibling `__tests__/` folder
- AND it MUST NOT be a flat `.ts` file directly under `use-cases/`

#### Scenario: Domain error test co-location

- GIVEN a domain error module under `src/domain/errors/` has an associated test file
- WHEN the test file is added or moved
- THEN it MUST live in `src/domain/errors/__tests__/`, not flat beside the source file

## Non-Goals

- No behavior, API, or business-rule change to `signInWithGoogle`, `getCurrentSession`, `signOut`, or `auth-errors` factory functions — those are covered by the `session-authentication` spec, unaffected here.
- Does not cover the deferred flat Server Action (`google-login.action.ts`) or flat non-shadcn UI components — explicitly out of scope per the proposal, tracked as a follow-up.
- Does not require renaming legacy third-person test titles to `should...` — deferred to a dedicated naming pass per AGENTS.md.

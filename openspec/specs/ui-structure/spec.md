# Specification: UI Structure

## Capability Statement

The UI layer of the application MUST enforce consistent module organization and test co-location patterns. Non-shadcn UI components, hooks, and route tests MUST follow kebab-case folder organization with sibling `__tests__/` directories. shadcn/ui primitives MUST live flat under a dedicated `shadcn/` folder. Presentational components without extractable logic MUST NOT be render-tested. Hook tests MUST use the hooks-only testing strategy. UI hooks MAY import browser-only infrastructure adapters under a narrowly scoped exception. This ensures maintainability, discoverability, testability, and alignment with Clean Architecture patterns.

Note: `infraestructure/` is the codebase's deliberate spelling (per AGENTS.md) and is preserved verbatim in all references — it is not a typo.

## Requirements

### Requirement: Own-Component Folder Organization

Each non-shadcn UI component under `src/ui/components/` MUST live in its own kebab-case folder containing the component's presentational file and an `index.ts` barrel re-exporting it. shadcn/ui primitives MUST live flat under `src/ui/components/shadcn/`, exempt from the per-component folder rule.

#### Scenario: New own component added

- GIVEN a developer adds a new non-shadcn UI component
- WHEN it is committed
- THEN it MUST reside in `src/ui/components/{component-name}/{component-name}.tsx` with an `index.ts` barrel
- AND it MUST NOT be a flat `.tsx` file directly under `components/`

#### Scenario: shadcn primitive added or moved

- GIVEN a shadcn/ui primitive (e.g. `card`, `separator`) is added or relocated
- WHEN it is committed
- THEN it MUST live under `src/ui/components/shadcn/` as a flat file
- AND consumers MUST import it from the `shadcn/` path

### Requirement: UI and Route Test Co-location

Test files for modules under `src/ui/` (hooks, own components) and route files under `src/app/` MUST live in a sibling `__tests__/` folder rather than flat beside the source file. The source module itself does not need to move.

#### Scenario: Existing hook or route test relocated

- GIVEN a hook test (`src/ui/hooks/`) or an app-route test (`src/app/**`) sits flat beside its source
- WHEN the test file is moved
- THEN it MUST land in a sibling `__tests__/` folder
- AND its relative import(s) MUST be updated to remain valid (e.g. `./x` → `../x`)

#### Scenario: New UI hook, component, or route test added

- GIVEN a developer adds a test for a hook, own component, or `app/` route
- WHEN the test file is created
- THEN it MUST be placed in a sibling `__tests__/` folder from the start

### Requirement: Presentational Components Are Not Rendered-Tested

A UI component with no component-scoped logic beyond static markup MUST NOT have a render/DOM test. Extractable logic (state, error mapping, calls to ports/actions) MUST live in a `{component-name}.hook.ts`, which MUST be the only unit under test for that component.

#### Scenario: Purely presentational component

- GIVEN a component has no local state, effects, or side-effecting logic (e.g. `login-header`, `login-footer`, `security-badges`)
- WHEN its folder is reviewed
- THEN it MUST have no test file

#### Scenario: Component with extractable logic

- GIVEN a component has local state, error-mapping, or a call to an application port (e.g. `login-card`)
- WHEN the logic is organized
- THEN it MUST be extracted into `{component-name}.hook.ts` and tested via `{component-name}.hook.test.ts`
- AND the presentational `.tsx` file MUST remain untested

### Requirement: UI Hook Browser-Only Infrastructure Adapter Exception

Hooks under `src/ui/hooks/` MUST NOT import non-Server-Action modules from `src/infraestructure/` at module scope, EXCEPT for a browser-only, non-serializable infrastructure adapter (one whose methods touch `window`/`document`) per AGENTS.md Hard Rule A1. That exception applies ONLY when the adapter is exposed as an overridable parameter with a module-level default — so tests and callers can inject a fake at the port boundary — and the specific case is justified in that PR's description; it is not a standing blanket carve-out for any hook matching the shape.

#### Scenario: Hook uses the sanctioned browser-only adapter exception

- GIVEN a UI hook depends on a browser-only, non-serializable infrastructure adapter (e.g. `use-google-auth.ts`'s `createGsiLoaderAdapter()`)
- WHEN the hook is defined
- THEN the adapter MAY be imported and constructed directly in the hook as a module-level default
- AND the corresponding parameter MUST remain optional/overridable so tests and callers can inject a fake

#### Scenario: Hook under test

- GIVEN a hook using the sanctioned adapter exception is unit tested
- WHEN the test invokes the hook
- THEN it MUST pass a fake/mock port via the overridable parameter
- AND MUST NOT rely on the real module-level default adapter

## Non-Goals

- No behavior, visual, or business-rule change to any product requirement or scenario.
- Does not require renaming legacy third-person test titles — deferred to a dedicated pass.
- Does not require an `index.ts` barrel for use-cases or Server Actions (per `application-structure`/`infraestructure-structure` specs) — the barrel requirement here is specific to own UI components.
- Does not sanction any browser-only infra adapter exception beyond the one scoped case already justified for `use-google-auth.ts` — a future hook seeking the same exception requires its own case-by-case justification, not automatic qualification under this requirement.

## Rationale

Clean Architecture depends on clear layer boundaries and consistent file organization. The `src/ui/` layer acts as the boundary between application-layer concerns and React/RSC framework specifics. Without consistent folder patterns and testing discipline:

- New developers must hunt for test files across flat hierarchies and mixed test styles (some components render-tested, some hook-tested, some untested)
- Test maintenance becomes error-prone during refactors (unclear which component requires a test, which logic belongs where)
- The asymmetry between application-layer organization (`use-cases/` folders, hooks-only testing) and UI-layer organization (flat files, inconsistent test styles) signals incomplete architectural discipline
- Browser-only adapters create RSC serialization constraints that cannot be solved by moving imports — they require explicit exception handling and careful port boundaries

Enforcing kebab-case folders, sibling `__tests__/` directories, presentational-hooks-only testing, and narrowly scoped adapter-import exceptions aligns UI with application/infrastructure-layer patterns, improving discoverability, testability, and honoring the permanent RSC constraint that makes honest exception-handling preferable to design workarounds.

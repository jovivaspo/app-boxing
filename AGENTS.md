<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project

A boxing app for managing training sessions, fighters, and gym activity. The codebase follows Clean/Hexagonal Architecture (see below) and evolves through Spec-Driven Development (SDD), with all planning artifacts persisted in Engram.

## Tech Stack

| Layer           | Technology                                   |
| --------------- | -------------------------------------------- |
| Framework       | Next.js 16 (App Router)                      |
| UI              | React 19                                     |
| Language        | TypeScript 5 (strict mode)                   |
| Styling         | Tailwind CSS v4 (`@import`-based, no config) |
| UI Components   | shadcn/ui (radix-nova style)                 |
| Validation      | Zod v4                                       |
| State           | Zustand 5                                    |
| Testing         | Vitest 4                                     |
| Linting         | ESLint 9 flat config                         |
| Formatting      | Prettier 3                                   |
| Package Manager | npm                                          |

## Architecture: Clean / Hexagonal

```
src/
├── app/             # Next.js App Router (pages, layouts, API routes)
├── domain/          # Entities, value objects, domain errors — NO framework imports
├── application/     # Ports (interfaces) — depends on domain only
│   └── use-cases/    # one folder per use case (pattern below)
├── infraestructure/ # Adapters: API clients, OAuth SDK, Zustand stores, DTOs, mappers
│   └── actions/      # Server Actions — one folder per action (pattern below)
├── ui/              # React components, hooks — depends on application ports (infra only via the exceptions in Hard Rules)
│   ├── components/  # own components + shadcn/ui (alias: @/ui/components)
│   │   ├── shadcn/       # shadcn/ui primitives (alias: @/ui/components/shadcn)
│   │   └── button/       # own component — one folder per component (pattern below)
│   └── hooks/       # Shared React hooks (alias: @/ui/hooks)
├── lib/             # Shared utilities (cn(), etc.)
```

> `infraestructure/` is intentionally spelled this way — it matches the real folder name. Do not rename it or create an `infrastructure/` folder.

Own (non-shadcn) component folder pattern — `kebab-case` folder, lowercase filenames:

```
button/
├── button.tsx            # presentational only, no logic
├── button.types.ts
├── button.hook.ts        # hook(s) used only within this component
├── index.ts              # barrel: export { Button } from "./button"
└── __tests__/
    └── button.hook.test.ts   # only the hook is tested, not the component
```

Server Action folder pattern — `kebab-case` folder, lowercase filenames:

```
google-login/
├── google-login.action.ts
└── __tests__/
    └── google-login.action.test.ts
```

Use case folder pattern — `kebab-case` folder, lowercase filenames:

```
sign-in-with-google/
├── sign-in-with-google.ts
└── __tests__/
    └── sign-in-with-google.test.ts
```

### Hard Rules

- **No classes** — functional programming only, project-wide. Adapters are factory functions (`createBackendAuthAdapter(): AuthPort`, not `class BackendAuthAdapter`); domain errors are functions returning typed objects (`invalidCredentials()`, not `class InvalidCredentials extends Error`).
- **Domain** MUST NOT import from React, Next.js, Zod, fetch, or any framework.
- **Application** MUST NOT import from infrastructure or UI.
- **Infrastructure** implements ports defined in application.
- **UI** depends on application ports, not on infra adapters. Two allowed exceptions: client components may invoke Server Actions from `src/infraestructure/actions/`, and `app/` route files (Server Components) act as the composition root that wires adapters into use cases.
- Components use Server Components by default; add `"use client"` only when necessary.
- New shadcn/ui components go in `src/ui/components/shadcn/` (NOT `src/components/ui/`).
- Own (non-shadcn) components, Server Actions, and use cases each get their own `kebab-case` folder — follow the folder patterns above exactly, including the `__tests__/` placement.
- Presentational components are not tested; only their hooks are.

## Path Aliases

```json
"@/*": ["./src/*"]
```

Everything under `src/` is importable via `@/` (e.g. `@/lib/utils`, `@/ui/components/shadcn/card`).

## Code Style

- **Quotes**: double (`"`)
- **Semicolons**: yes
- **Tab width**: 2 spaces
- **Trailing commas**: ES5
- **Linter**: `npm run lint` (ESLint 9 + `core-web-vitals` + `typescript` + Prettier)
- **Formatter**: `npm run format` (Prettier + `prettier-plugin-tailwindcss`)
- Use `cn()` from `@/lib/utils` for conditional class merging (clsx + tailwind-merge).
- Path aliases with `@/` — never use relative paths across layer boundaries.

### File & Folder Naming

- **Folders**: `kebab-case` (e.g. `user-profile/`, `auth-provider/`)
- **React components outside `src/ui/components/`** (`.tsx`): `PascalCase`, matching the exported component name (e.g. `UserCard.tsx`, `LoginForm.tsx`)
- **Hooks, utils, helpers** (`.ts`): `camelCase` (e.g. `useAuth.ts`, `formatDate.ts`)
- **Next.js special files**: framework-mandated lowercase (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`). Their route folder (e.g. `app/profile/`) already is the "folder named after the piece" — no extra nesting needed. Only the test moves into a sibling `__tests__/` inside that route folder, e.g. `app/profile/page.tsx` → `app/profile/__tests__/page.test.tsx`.
- **Test files**: same base name as the module under test, placed in a sibling `__tests__/` folder — e.g. `formatDate.ts` → `__tests__/formatDate.test.ts` (see [Testing](#testing))
- **Own components in `src/ui/components/`**: exception to the `PascalCase` rule above — `kebab-case` folder with lowercase filenames matching the folder name (see the component folder pattern in [Architecture](#architecture-clean--hexagonal)). shadcn/ui primitives stay flat under `src/ui/components/shadcn/` and are untouched by this rule.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run format       # Prettier (write)
npm run format:check # Prettier (check only)
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
npx tsc --noEmit     # Type-check without emitting
```

Definition of done — before committing, all of these must pass: `npm run lint`, `npx tsc --noEmit`, `npm run test`.

## Pull Requests

- Every PR MUST follow the template in `.github/PULL_REQUEST_TEMPLATE.md`, filling in all its sections (Title, Context, Solution, Changes, How to test).
- `gh pr create` does not apply the template automatically — build the PR body from the template's sections when creating PRs from the CLI.
- Link the related GitHub Issue in the Context section.

## Testing

- Runner: Vitest 4, globals enabled. Environment: `node` by default. Test files that need a DOM (Testing Library `render`/`renderHook`, adapters that touch `document`) declare `// @vitest-environment jsdom` in a docblock at the top of the file. Do NOT use `environmentMatchGlobs` — it was removed in Vitest 4.
- Config: `vitest.config.mts` — mirrors the `@/*` path alias.
- Tests are never colocated flat next to their source file. They live in a `__tests__/` folder sibling to what they test: `foo.ts` → `__tests__/foo.test.ts` (or `.spec.ts`). This applies project-wide — `domain/`, `application/`, `infraestructure/`, `ui/`, etc. — not only the per-piece folders described in [Architecture](#architecture-clean--hexagonal).
- Where needed, `__mocks__/` (manual mocks for a dependency, e.g. a port/adapter) and `__builders__/` (test data builders/factories, e.g. building a domain model for a test) sit at the same level as `__tests__/`. They're opt-in — only add them when a piece actually needs a mock or a builder, not by default.
- `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` are installed for hook testing (`renderHook`).

### Test Writing Rules

- **TDD**: write the failing test first, then the implementation that makes it pass.
- **Naming**: every test title starts with `should` and describes observable behavior, not implementation — `it("should reject with InvalidCredentials when the ID token is empty")`. Existing tests predate this rule (third-person titles); rename them only in a dedicated pass, never mixed into unrelated PRs.
- **One behavior per test**: if the title chains unrelated behaviors with "and", split the test.
- **Structure**: Arrange-Act-Assert, with the three phases separated by blank lines.
- **`describe` blocks** are named after the unit under test — `describe("signInWithGoogle", ...)`.
- **Mock at port boundaries only** (ports/adapters). Never mock internals of the unit under test. Domain tests use no mocks at all.
- **Deterministic**: no real network, timers, or system time — use `vi.useFakeTimers()` / `vi.setSystemTime()` and manual mocks. Tests must pass in any order and in isolation.

## SDD

This project uses spec-driven development with Engram as the artifact store: SDD artifacts (explorations, proposals, specs, tasks) are persisted as Engram memories under `sdd/<change>/<phase>` topic keys. The `openspec/` directory holds file snapshots of SDD artifacts (config, main specs, active and archived changes) — Engram is the source of truth for SDD state; do not treat `openspec/` files as canonical on their own.

- **Init**: run `sdd-init` before any SDD work. Testing capabilities are cached in Engram.
- Pending work is tracked in GitHub Issues.

## Tailwind CSS v4 Notes

- No `tailwind.config.js` — use CSS `@theme inline {}` in `src/app/globals.css`.
- No `@tailwind base/components/utilities` — use `@import "tailwindcss"`.
- Dark mode: class-based with `@custom-variant dark (&:is(.dark *))`.

## shadcn/ui Notes

- Base color: neutral, CSS variables enabled.
- `npx shadcn add <name>` writes to the path in `components.json` → `aliases.ui`, currently `@/ui/components` (flat). The target location is `src/ui/components/shadcn/` — update `aliases.ui` to `@/ui/components/shadcn` as part of the Issue #5 migration; until then, move newly added primitives into `shadcn/` manually.
- The `shadcn/tailwind.css` import is in `globals.css`.

## Design

Stitch project: https://stitch.withgoogle.com/projects/6380251267090136078

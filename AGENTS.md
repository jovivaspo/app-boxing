<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Google Auth Login — Agent Instructions

## Project

Production-ready Next.js 16 starter for Google OAuth authentication. The architecture layers are scaffolded but empty; domain logic, use cases, and adapters are built on top.

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
| Testing         | Vitest 4 (node environment)                  |
| Linting         | ESLint 9 flat config                         |
| Formatting      | Prettier 3.9                                 |
| Package Manager | npm                                          |

## Architecture: Clean / Hexagonal

```
src/
├── app/             # Next.js App Router (pages, layouts, API routes)
├── domain/          # Entities, value objects, domain errors — NO framework imports
├── application/     # Use cases, ports (interfaces) — depends on domain only
├── infraestructure/ # Adapters: API clients, OAuth SDK, Zustand stores, DTOs, mappers
├── ui/              # React components, hooks — depends on application ports, never infra directly
│   ├── components/  # shadcn/ui components (alias: @/ui/components)
│   └── hooks/       # Shared React hooks (alias: @/ui/hooks)
├── lib/             # Shared utilities (cn(), etc.)
```

### Hard Rules

- **Domain** MUST NOT import from React, Next.js, Zod, fetch, or any framework.
- **Application** MUST NOT import from infrastructure or UI.
- **Infrastructure** implements ports defined in application.
- Components use Server Components by default; add `"use client"` only when necessary.
- New shadcn/ui components go in `src/ui/components/` (NOT `src/components/ui/`).
- Representational components will not be tested; only their hooks will be tested.

## Path Aliases

```json
"@/*": ["./src/*"]
```

| Alias               | Resolves to           |
| ------------------- | --------------------- |
| `@/lib/utils`       | `src/lib/utils.ts`    |
| `@/ui/components/*` | `src/ui/components/*` |
| `@/ui/hooks/*`      | `src/ui/hooks/*`      |

## Code Style

- **Quotes**: double (`"`)
- **Semicolons**: yes
- **Tab width**: 2 spaces
- **Trailing commas**: ES5
- **Linter**: `npm run lint` (ESLint 9 + `core-web-vitals` + `typescript` + Prettier)
- **Formatter**: `npm run format` (Prettier + `prettier-plugin-tailwindcss`)
- Use `cn()` from `@/lib/utils` for conditional class merging (clsx + tailwind-merge).
- Path aliases with `@/` — never use relative paths across layer boundaries.

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

## Testing

- Runner: Vitest 4, environment: `node`, globals enabled.
- Config: `vitest.config.mts` — mirrors the `@/*` path alias.
- Test files go next to the module they test: `foo.test.ts` or `foo.spec.ts`.
- No `@testing-library/react` or `jsdom` installed; add them before testing components.

## SDD / OpenSpec

This project uses OpenSpec for spec-driven development.

- `openspec/config.yaml` — project context, testing config, phase rules.
- `openspec/specs/` — canonical specs.
- `openspec/changes/` — active change artifacts.
- `docs/pending-tasks/pending-tasks.md` - list of pending tasks.
- **Init**: run `sdd-init` before any SDD work. Testing capabilities are cached in Engram.

## Tailwind CSS v4 Notes

- No `tailwind.config.js` — use CSS `@theme inline {}` in `src/app/globals.css`.
- No `@tailwind base/components/utilities` — use `@import "tailwindcss"`.
- Dark mode: class-based with `@custom-variant dark (&:is(.dark *))`.

## shadcn/ui Notes

- Base color: neutral, CSS variables enabled.
- New components added via `npx shadcn add <name>` go to `@/ui/components/`.
- The `shadcn/tailwind.css` import is in `globals.css`.

## Flow Diagram

See `flow.png` and `flow-frontend-layer.png` for the Google OAuth authentication flow (7-step: redirect → code → token exchange → session → protected area).

## Design

Stitch project: https://stitch.withgoogle.com/projects/6380251267090136078



# Exploration: Timer Configuration Screens (Issue #21)

**What**: Explored codebase for issue #21 (timer configuration list + form screens, UI layer only). No code written.

**Why**: Prep for sdd-propose on change `timer-configuration-screens`.

**Where** (existing pieces, already merged from #17-#20):

- Domain: `src/domain/timer-configuration/timer-configuration.model.ts` — `TimerConfiguration { id, name, rounds, roundDuration (sec), restDuration (sec), warnBeforeEnd, bellSound }`, `TimerLevel = "amateur"|"pro"|"elite"`, `calculateTimerLevel({rounds})` (<=7 amateur, <=12 pro, else elite) — exactly matches the "level badge" the list card needs.
- Domain errors: `src/domain/errors/timer-configuration-errors.ts` — `invalidTimerConfiguration()`, `validateTimerConfiguration()` (throws if rounds/roundDuration/restDuration <= 0), `timerConfigurationNotFound(id)`.
- Port: `src/application/ports/timer-configuration-repository.port.ts` — `TimerConfigurationRepositoryPort { create(Omit<TC,"id">), list(), update(TC), delete(id) }`.
- Use cases (factory-of-execute pattern, functional, no classes): `create-timer-configuration`, `update-timer-configuration`, `delete-timer-configuration`, `list-timer-configuration` under `src/application/use-cases/*/`. Each takes `{ repository }` deps.
- Adapters: `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` (needs `BACKEND_URL` + bearer token, throws generic Error on non-2xx except 404→notFound) and `local-timer-configuration.adapter.ts` (localStorage, single JSON blob key `timer-configurations`, guest path).
- Mock/builder: `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts` (`makeTimerConfigurationRepositoryPort`), `src/domain/timer-configuration/__builders__/timer-configuration.builder.ts` (`buildTimerConfiguration`).
- Only Server Action precedent for this slice: `src/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action.ts` — migration only, NOT CRUD. No create/update/delete/list Server Actions exist yet for #21 to reuse.
- Composition-root precedent: `src/app/page.tsx` and `src/app/profile/page.tsx` call `getCurrentSession({ session: createCookieSessionAdapter() })()` and `redirect("/login")` if absent; `page.tsx` also mounts `<TimerConfigurationMigrationRunner />` (client component, hook-only logic per A2).
- Own-component pattern precedent: `src/ui/components/timer-configuration-migration-runner/` — `.tsx` (presentational, `"use client"`, renders null, calls only the hook), `.hook.ts` (all Server Action / adapter calls, A1 pattern with overridable default param for browser-only adapters), `index.ts` barrel, `__tests__/*.hook.test.ts` (jsdom docblock, `renderHook`, mocks Server Action via `vi.mock` + port mock builder, no adapter internals mocked).
- shadcn primitives installed so far: ONLY `card.tsx` and `separator.tsx` under `src/ui/components/shadcn/`. No button, input, switch/toggle, dialog, stepper — these need `npx shadcn add` (style: radix-nova, baseColor neutral, cssVariables) then manual move into `shadcn/` per `components.json` note in AGENTS.md. `radix-ui` (`^1.6.1`, umbrella package) and `lucide-react` are already dependencies, so adding those primitives needs no new deps.
- Theme/fonts ALREADY WIRED for the Stitch "Iron Pulse" design: `src/app/layout.tsx` loads Anton (`--font-heading`), JetBrains Mono (`--font-mono`), Inter (`--font-sans`) via `next/font/google`; `src/app/globals.css` `:root` already has dark Iron-Pulse palette (`--background:#131313`, `--primary:#dc0000`, `--accent:#f9bd22`, `--radius:0`). No new theme setup needed — screens just consume existing CSS vars/Tailwind classes.
- `src/app/` currently has no timer-configuration route at all (only `login`, `profile`, `api/logout`, root `page.tsx`). No dynamic-route (`[id]`) precedent exists anywhere in the app yet.
- Stitch MCP tools (`mcp__stitch__*`) were NOT available in this explore session's toolset; `WebFetch` on the Stitch project URL returned no usable screen content initially. **Resolved later** — see proposal.md for the actual Stitch screen specs, pulled directly by the orchestrator via `mcp__stitch__list_screens`/`get_screen` + `WebFetch` on the HTML download URLs.

**Learned / open questions carried into sdd-propose** (all resolved during propose — see proposal.md's Decisions log):

1. CRUD Server Action shape and adapter-selection strategy.
2. Routing shape for list vs. create vs. edit.
3. Delete confirmation.
4. Missing shadcn primitives.
5. Stitch screen specs — resolved via direct Stitch MCP access.
6. Test convention: jsdom docblock, `renderHook`/`waitFor` from testing-library, `vi.mock` at the Server Action module boundary, `makeTimerConfigurationRepositoryPort` mock builder, `buildTimerConfiguration` builder — no adapter internals ever mocked directly, only ports/actions.

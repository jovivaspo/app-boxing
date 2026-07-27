# Proposal: Timer Configuration Screens (issue #21)

## Intent

Timer CRUD exists end-to-end (domain, port, 4 use cases, backend + local adapters, merged #17-#20) but is unreachable: no route, no screen, no CRUD Server Action. Users cannot create, see, edit, or delete a timer. This change ships the two approved Stitch screens ("Mis Cronómetros" list, "Configurar Timer" form) and the wiring that makes the existing stack usable.

## Scope

### In Scope

- **Add `getById(id)` to `TimerConfigurationRepositoryPort`**, implemented in both adapters: backend adapter calls `GET {baseUrl}/{id}` (confirmed to exist in the backend's swagger, `https://appboxeo-api.onrender.com/swagger-ui/index.html`) reusing the existing `ensureOk(response, id)` 404→`timerConfigurationNotFound` mapping; local adapter does an array `find` over `readAll()`, throwing `timerConfigurationNotFound` when absent. Both get test coverage alongside the existing adapter test suites.
- Routes: `/timers` (list), `/timers/new` (create), `/timers/[id]/edit` (pre-filled edit). First dynamic route in the app — sets the convention. `/timers` is reachable WITHOUT authentication (confirmed — see Decisions log).
- List screen: name, level badge (ELITE/PRO/AMATEUR via `calculateTimerLevel`), rounds, work/rest in `m:ss`, per-card edit + delete (no confirm dialog), "Nuevo Timer" action, Iron Pulse header/headline/subheading/quote copy. Empty state: the "Nuevo Timer" card alone plus a short inviting line (no timers saved yet) — confirmed, no richer empty-state design needed.
- Form screen (shared create/edit): back arrow, name text input, rounds stepper (custom, button + input), work/rest duration as TWO numeric inputs each (minutes, seconds — combined to seconds internally for the domain model, confirmed), "Ajustes Avanzados" switches for `warnBeforeEnd` and `bellSound`, "Guardar Timer" button that redirects to `/timers` on success (confirmed).
- 4 Server Actions, one folder each (`list|create|update|delete-timer-configuration`), mirroring `migrate-timer-configurations` shape: `{action}.action.ts` + `__tests__/`.
- shadcn primitives: `button`, `input`, `switch` added via `npx shadcn add`, moved into `src/ui/components/shadcn/`.

### Out of Scope / Non-Goals

- **Bottom nav (Train/Matches/Stats/Profile) from the mockup** — those destinations do not exist; not implemented, not stubbed.
- Running/executing a timer, sound playback, reordering, search/filter, pagination.
- Delete confirmation dialog (explicitly decided against), `alert-dialog` primitive.
- Any change to domain, use cases — wire only, aside from the confirmed `getById` port addition above.
- New dependencies (`radix-ui` + `lucide-react` already installed).
- Single combined "m:ss" text input for durations (rejected — using two numeric inputs instead).
- Staying on the form after save with an inline confirmation (rejected — redirects to `/timers` instead).

## Capabilities

### New Capabilities

- `timer-configuration-screens`: user-facing list/create/edit/delete screens, routing shape, and the Server Action surface exposing existing timer use cases to the UI.

### Modified Capabilities

- `timer-configuration-repository` port: adds `getById(id): Promise<TimerConfiguration>` to the contract; both existing adapters (backend, local) implement it.

## Approach

**Adapter selection.** Authenticated users go through Server Actions (backend adapter + `createCookieSessionAdapter()` token, same fail-closed style as the migration action). Guests cannot: the local adapter is `localStorage` and unreachable server-side. So each route (Server Component composition root) resolves the session and passes a serializable `isAuthenticated` flag; the client hook branches — Server Action when authenticated, injected local adapter (A1 overridable default) when guest. `/timers` must NOT redirect to `/login`; guest-local timers are exactly what the login migration exists to absorb.

**Components** (`src/ui/components/`, kebab-case + `.tsx` / `.hook.ts` / `index.ts` / `__tests__/`):

| Component                  | Kind           | Logic                                                                                                                                                             |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timer-configuration-list` | client         | hook: load, delete, optimistic removal, error/empty state                                                                                                         |
| `timer-configuration-card` | presentational | no test                                                                                                                                                           |
| `timer-configuration-form` | client         | hook: field state (name, rounds, work min/sec, rest min/sec, warnBeforeEnd, bellSound), submit create/update, validation errors, redirect to `/timers` on success |
| `rounds-stepper`           | client         | hook: increment/decrement, min bound                                                                                                                              |

`m:ss` formatting/parsing (for the LIST display only, since the form uses two numeric inputs) goes in `src/lib/duration.ts` with its own `__tests__/` — framework-free.

**Edit lookup.** The port now exposes `getById(id)` (confirmed decision, see Scope). Edit resolves via a single `getById` call — no more `list()` + find. `notFound()` (auth) or empty-state redirect (guest) when the id is missing.

## Affected Areas

| Area                                                                                                             | Impact   | Description                                    |
| ---------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `src/application/ports/timer-configuration-repository.port.ts`                                                   | Modified | add `getById(id): Promise<TimerConfiguration>` |
| `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` (+ `__tests__/`)                | Modified | implement `getById` via `GET {baseUrl}/{id}`   |
| `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts` (+ `__tests__/`)                  | Modified | implement `getById` via array find             |
| `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts`                                    | Modified | add `getById` to the port mock builder         |
| `src/app/timers/**`                                                                                              | New      | 3 routes, composition roots, `__tests__/`      |
| `src/infraestructure/actions/{list,create,update,delete}-timer-configuration/`                                   | New      | 4 Server Actions + tests                       |
| `src/ui/components/{timer-configuration-list,timer-configuration-card,timer-configuration-form,rounds-stepper}/` | New      | screens + hooks + hook tests                   |
| `src/ui/components/shadcn/`                                                                                      | New      | button, input, switch                          |
| `src/lib/duration.ts`                                                                                            | New      | `m:ss` format (display, list only) + tests     |
| `src/app/page.tsx`                                                                                               | Modified | link to `/timers`                              |

## Risks

| Risk                                               | Likelihood | Mitigation                                                                                               |
| -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Guest vs. auth dual path doubles hook branches     | High       | Single `useTimerConfigurations` hook owning the branch; screens stay unaware                             |
| Scope > 400-line PR budget                         | High       | Slice: (1) port `getById` + shadcn + `duration.ts`, (2) Server Actions, (3) list screen, (4) form screen |
| Backend adapter throws generic `Error` on non-2xx  | Med        | Actions return serializable result objects, never throw across the RSC boundary                          |
| Stitch pixel fidelity unverifiable from text specs | Med        | Theme vars/fonts already wired; visual polish deferred to review                                         |

## Rollback Plan

Purely additive except the `/timers` link in `page.tsx` and the `getById` port addition (new method, does not change existing method signatures — non-breaking). Revert the feature branch (or delete `src/app/timers/`, the 4 action folders, the new components, and the `getById` implementations); nothing existing depends on them.

## Success Criteria

- [ ] `/timers` lists timers with correct level badge and `m:ss` durations for both authenticated and guest users, showing the "Nuevo Timer" empty state when none exist
- [ ] `/timers/new` creates; `/timers/[id]/edit` loads pre-filled via `getById` and updates; both redirect to `/timers` on success
- [ ] Per-card delete removes immediately, no dialog
- [ ] Both toggles persist `warnBeforeEnd` / `bellSound`
- [ ] Invalid input (non-positive rounds/durations) surfaces an inline error, no crash
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` pass; no bottom nav shipped

## Stitch screen specs (pulled directly via Stitch MCP)

**"Cronómetros" list screen** (`projects/6380251267090136078/screens/404b828d9f5342c5bc02800cc75757a3`):

- Header "IRON PULSE"; headline "Mis Cronómetros"; subheading "PREPARA TU SESIÓN. MÁXIMA INTENSIDAD."; motivational quote footer "No cuentes los días, haz que los días cuenten."
- Each card: name, level badge (ELITE/PRO), rounds, work/rest duration in `m:ss`, "edit"/"delete" actions.
- Global "Nuevo Timer" action.
- Bottom nav with 4 icons (Train/Matches/Stats/Profile) appears in the mockup but is OUT OF SCOPE — those destinations don't exist yet.

**"Configurar Timer" form screen** (`projects/6380251267090136078/screens/793eee5e3194462698b8685e249aaf8f`):

- Header with back-arrow, title "Configurar Timer".
- Fields: "Nombre del Timer" (text), "Asaltos / Rounds" (stepper), "Trabajo" and "Descanso" (numeric duration inputs).
- "Ajustes Avanzados" section: toggle "Aviso de 10 segundos" (`warnBeforeEnd`), toggle "Sonido de campana" (`bellSound`).
- Primary action: "Guardar Timer".

## Decisions log

- 2026-07-26: user confirmed one-Server-Action-file-per-operation, proposed routes OK, no delete confirmation dialog, add missing shadcn primitives as needed.
- 2026-07-26: user confirmed adding `getById` to `TimerConfigurationRepositoryPort` (backend swagger confirms `GET /api/v1/timer-configurations/{id}` exists) instead of `list()` + find for edit lookup.
- 2026-07-26: user confirmed `/timers` is accessible WITHOUT authentication (guest/local-adapter path stays as designed).
- 2026-07-26: user confirmed all remaining proposal assumptions (empty state, duration input shape, post-save redirect) as originally proposed — no changes needed. Proposal is fully unblocked for `sdd-spec` and `sdd-design`.

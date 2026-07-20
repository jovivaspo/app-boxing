# Exploration: Local + Backend adapters for TimerConfigurationRepository (Issue #19)

## Current State

**Port** (`src/application/ports/timer-configuration-repository.port.ts`) — interface is `TimerConfigurationRepositoryPort`:

```ts
export interface TimerConfigurationRepositoryPort {
  create(config: Omit<TimerConfiguration, "id">): Promise<TimerConfiguration>;
  list(): Promise<TimerConfiguration[]>;
  update(config: TimerConfiguration): Promise<TimerConfiguration>; // @throws TimerConfigurationNotFound
  delete(id: string): Promise<void>; // @throws TimerConfigurationNotFound
}
```

Manual mock: `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts`.

**Domain model** (`src/domain/timer-configuration/timer-configuration.model.ts`): `TimerConfiguration { id, name, rounds, roundDuration, restDuration, warnBeforeEnd, bellSound }` + `calculateTimerLevel`. Errors (`src/domain/errors/timer-configuration-errors.ts`): `_tag`-discriminated, `invalidTimerConfiguration()`, `timerConfigurationNotFound(id)`. Binding #18 design decision: the port/adapter itself must reject with `timerConfigurationNotFound(id)` on missing records — use cases (`src/application/use-cases/{create,list,update,delete}-timer-configuration/`) do no lookup, only propagate.

## Affected Areas

- `src/infraestructure/local-timer-configuration.adapter.ts` (new, exact path TBD in design) — first `localStorage`-based adapter in this codebase (confirmed zero existing `localStorage` usage via grep).
- `src/infraestructure/backend-timer-configuration.adapter.ts` + `dto/` + `mappers/` (new) — mirrors the only existing backend-adapter precedent, `src/infraestructure/auth/backend-auth.adapter.ts` (factory reads `BACKEND_URL` inline, fails closed with a domain error if unset, raw `fetch`, Zod `safeParse` DTO validated at boundary, `mappers/` translates DTO→domain). No shared fetch wrapper exists anywhere — every backend adapter does its own `fetch()`.
- Composition root: `src/app/page.tsx`, `src/app/profile/page.tsx` are the only precedent (`async` Server Component, `force-dynamic`, `await getCurrentSession({ session: createCookieSessionAdapter() })()`, redirect to `/login` if no session) — every existing route currently requires login; there is no guest-allowed route to model against, and no `app/` route for the timer feature exists yet.
- `src/infraestructure/auth/gsi-loader.adapter.ts` — the A1-exception precedent (browser-only adapter constructed directly in a UI hook) that the local adapter structurally must follow, since `localStorage` cannot be reached from a Server Component.

## Approaches

1. **Backend adapter now, local adapter deferred to when a route exists** — build only what's server-composable today.
   - Pros: composition-root wiring stays literal/testable now.
   - Cons: violates the issue's explicit acceptance criteria (both adapters required).
   - Effort: Low.
2. **Both adapters built and tested in isolation, wiring plan documented but not executed (no `app/timer` route created in this issue)** — matches "Unblocks #ui-management" language in the issue.
   - Pros: fully satisfies "implemented and tested" criteria; composition-root selection logic is designed and ready, just has no consumer yet.
   - Cons: "Composition root selects adapter based on session state" criterion is only proven correct on paper until the UI issue lands.
   - Effort: Medium.
3. **Force a placeholder `app/` route in this issue just to prove the wiring** — over-scopes issue #19 into UI territory it doesn't own.
   - Pros: proves the composition-root claim end-to-end now.
   - Cons: scope creep past "Infrastructure" (issue's own Affected Area), duplicate work once #ui-management lands.
   - Effort: High.

## Recommendation

Approach 2. Build and test both adapters to the exact port contract; document (not implement) the composition-root split — backend adapter instantiated in a future Server Component when `getCurrentSession()` resolves a session, local adapter instantiated client-side in a UI hook via the A1 pattern when it doesn't (localStorage is structurally unreachable from any Server Component). Confirm this reading with the user before the proposal locks scope, since nothing in `app/` today can consume the wiring criterion literally.

## Risks

- **Composition-root ambiguity** — the issue's acceptance criterion assumes a consumer route that doesn't exist yet. Needs explicit user sign-off before proposal.
- **`localStorage` in tests** — not available in Vitest's default `node` environment; the local adapter's test needs `// @vitest-environment jsdom` per AGENTS.md testing rules (no existing precedent for this in the repo).
- **Backend "not found" status code unknown** — no existing non-auth backend endpoint precedent to confirm which HTTP status `/api/v1/timer-configurations` uses for missing records, needed to map correctly to `timerConfigurationNotFound(id)`.

## Open Questions

1. Is "composition root selects adapter based on session state" an actual `app/` route change in _this_ issue, or are the adapters delivered ready-to-wire with actual wiring deferred to the future UI issue (#ui-management)? Evidence points to the latter — no consuming route exists.
2. Given localStorage's browser-only nature, should the eventual wiring be "Server Component picks backend adapter when session exists" + "UI hook picks local adapter via A1 when it doesn't" — or a different shape (e.g. resolve session server-side and pass an explicit flag down to a client hook that always constructs both, using the flag to pick)?
3. What HTTP status does the real `/api/v1/timer-configurations` backend return for "not found" on update/delete — no existing non-auth backend precedent to confirm against.

## Ready for Proposal

Yes for the two adapters + DTO/mapper + tests — well-precedented from the auth slice. The composition-root acceptance criterion needs explicit user clarification before scope locks.

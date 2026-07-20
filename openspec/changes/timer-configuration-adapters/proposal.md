# Proposal: Local + Backend adapters for TimerConfigurationRepository (Issue #19)

## Intent

Issue #18 merged `TimerConfigurationRepositoryPort` (`create`/`list`/`update`/`delete`) plus domain model, errors, and use cases — but no adapter implements the port, so nothing can persist a timer configuration. This change delivers the two concrete adapters that fulfill the contract, unblocking the future timer management UI (`#ui-management`): a guest-facing `localStorage` adapter and a logged-in `/api/v1/timer-configurations` backend adapter. Both mirror the auth slice's precedent — no new abstraction, no new dependency.

## Scope

### In Scope

- A minimal `localStorage` utility (`src/infraestructure/storage/local-storage.util.ts`) — plain functions (`getItem`/`setItem`/`removeItem`), not a port/interface: JSON serialize/parse with error handling, SSR guard (`typeof window === "undefined"`) since this code can be touched during a Server Component render. No abstraction beyond what's needed to call `localStorage` safely — promote to a port only if a second real consumer appears (matches the codebase's own precedent: no shared `fetch` wrapper exists either, see `backend-auth.adapter.ts`).
- Local `localStorage` adapter implementing all four port methods (built on top of the utility above), tested in `jsdom`.
- Backend adapter (raw `fetch`, `BACKEND_URL` read inline, fail-closed if unset) + `dto/` (Zod `safeParse` at boundary) + `mappers/` (DTO→domain), mirroring `backend-auth.adapter.ts`.
- Both adapters reject with `timerConfigurationNotFound(id)` on missing records for `update`/`delete`.
- Contract tests proving both adapters honor the port shape and error behavior.
- A **design note** documenting composition-root adapter selection (which adapter, when, where the decision will live) — documented, not wired.

### Out of Scope

- Any `app/` route or composition-root **wiring execution** — no consuming route exists yet; wiring lands with `#ui-management`.
- UI hooks, components, React Query, or the A1 client-side construction of the local adapter.
- Changes to the port, domain model, errors, or use cases (all merged in #18).
- A shared fetch wrapper or any new dependency.

## Capabilities

### New Capabilities

- `timer-configuration-persistence`: adapter behavior fulfilling the repository port — guest (`localStorage`) vs logged-in (backend) persistence, DTO validation at the boundary, and not-found error mapping.

### Modified Capabilities

- None. `infraestructure-structure` already governs folder/test placement generically.

## Approach

Exploration Approach 2: build and test both adapters to the exact port contract in isolation; document the composition-root split rather than execute it. Backend adapter is server-composable; the local adapter is browser-only (structurally unreachable from a Server Component) and will be constructed client-side via the A1 exception once a route exists.

## Affected Areas

| Area                                     | Impact | Description                                                                                 |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `src/infraestructure/storage/`           | New    | `localStorage` utility functions (JSON + SSR guard) + `__tests__/` (`jsdom`)                |
| `src/infraestructure/` (local adapter)   | New    | `localStorage`-backed port implementation (uses the utility above) + `__tests__/` (`jsdom`) |
| `src/infraestructure/` (backend adapter) | New    | `fetch`-backed port implementation + `dto/` + `mappers/` + `__tests__/`                     |

## Risks

| Risk                                                            | Likelihood | Mitigation                                                                                |
| --------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| Backend "not found" HTTP status unknown (no non-auth precedent) | High       | Hand off to `sdd-design` to decide status→error mapping; make it a single point of change |
| `localStorage` unavailable in default `node` test env           | Med        | `// @vitest-environment jsdom` docblock per AGENTS.md                                     |
| Composition-root criterion unprovable until UI lands            | Med        | Deliver as documented design note; user-confirmed scope                                   |

## Rollback Plan

Adapters are additive and have no consumer yet — deleting the two new adapter folders (and `dto/`/`mappers/`) fully reverts the change with zero impact on existing code.

## Dependencies

- Issue #18 (port, domain model, errors, use cases) — merged.

## Success Criteria

- [ ] Both adapters implement all four port methods and pass contract tests.
- [ ] `update`/`delete` on a missing record reject with `timerConfigurationNotFound(id)`.
- [ ] Local adapter test runs under `jsdom`; backend adapter validates DTOs via Zod `safeParse`.
- [ ] Composition-root selection is documented as a design note, not wired.

## Open Decisions for `sdd-design`

- Exact adapter file locations/names (flat under `infraestructure/` vs a `timer-configuration/` folder).
- Backend DTO shape for the four operations + HTTP status→`timerConfigurationNotFound` mapping.
- Local adapter storage strategy: single JSON blob vs keyed entries; `id` generation (`crypto.randomUUID()`).

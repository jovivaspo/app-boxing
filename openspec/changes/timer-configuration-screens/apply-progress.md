# Apply Progress: Timer Configuration Screens (issue #21)

## Slice 1 — Foundations: DONE

**What**: Slice 1 (Foundations) of timer-configuration-screens (issue #21) fully implemented, tasks 1.1-1.7 all done. First apply batch for this change — no prior progress to merge.

**Why**: Wire `getById` into the repository port/adapters/mock, add the `get-timer-configuration` passthrough use case, add framework-free duration helpers, and vendor the 3 shadcn primitives needed by later slices (2/3/4), per the confirmed tasks artifact (obs #105) and design (obs #104).

**Where**:

- `src/application/ports/timer-configuration-repository.port.ts` — added `getById(id): Promise<TimerConfiguration>` (1.1, done)
- `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts` — added `getById` mock (1.2, done)
- `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts` + `__tests__/` — `getById` implemented: happy path, not-found, SSR-routes-to-not-found (readAll() returns [] under SSR via existing getItem SSR guard) (1.3, done, all 3 TDD steps)
- `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` + `__tests__/` — `getById` implemented: `GET {baseUrl}/{id}` with Bearer header, `ensureOk(response, id)` 404→not-found mapping, reuses shared `parseBody`/DTO-validation generic-error path (extended existing it.each tables to include `getById`) (1.4, done, all 3 TDD steps)
- `src/application/use-cases/get-timer-configuration/get-timer-configuration.ts` + `__tests__/` — passthrough to `repository.getById`, mirrors `list`/`delete` use-case pattern exactly (1.5, done)
- `src/lib/duration.ts` + `__tests__/duration.test.ts` — `formatDuration` (m:ss, zero-padded seconds), `splitDuration`, `toTotalSeconds` (NaN/empty → 0); framework-free (1.6, done)
- `src/ui/components/shadcn/{button,input,switch}.tsx` — vendored via `npx shadcn add button input switch`, moved from the flat `components.json`-configured path into `shadcn/` manually (aliases.ui left untouched, owned by issue #5); Prettier-formatted to match existing vendored files (1.7, done, no test — vendored code)

**Learned**: `npx shadcn add` wrote files flat to `src/ui/components/` per the current (not-yet-migrated) `components.json` `aliases.ui`, exactly as the design doc anticipated — moved manually without touching `aliases.ui`. No new npm dependencies were needed (class-variance-authority/radix-ui already present). All 5 backend-adapter `it.each` regression tables extended to include `getById` alongside `create/list/update/delete`.

**Status**: `npm run test` → 165/165 passed (29 files). `npx tsc --noEmit` → clean. `npm run lint` → 0 errors, 9 pre-existing `_id` unused-var warnings (unrelated, predate this batch). Working tree left uncommitted — orchestrator to review/commit. Slices 2, 3, 4 untouched.

## Slice 2a — Result module + list + delete actions: NOT STARTED

## Slice 2b — Create + update actions: NOT STARTED

## Slice 3 — List screen: NOT STARTED

## Slice 4 — Form screen: NOT STARTED

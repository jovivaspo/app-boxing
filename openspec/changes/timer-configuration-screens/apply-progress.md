# Apply Progress: Timer Configuration Screens (issue #21)

**What**: Slice 1 (Foundations) — tasks 1.1-1.7 — fully implemented and committed (3 commits on `feat/21-timer-configuration-screens`). Slice 2a (Result module + list + delete Server Actions) — tasks 2.1, 2.2, 2.3 — fully implemented, committed as its own PR-sized unit targeting `main` per the confirmed stacked-to-main chain.

**Why**: Wire `getById` into the repository port/adapters/mock, add the `get-timer-configuration` passthrough use case, add framework-free duration helpers, vendor the 3 shadcn primitives (slice 1); then add the serializable `Result<T>` error-code taxonomy and the first two of four Server Actions so slice 3 (list screen) can consume them (slice 2a), per the confirmed tasks artifact (obs #105) and design (obs #104).

## Slice 1 — Foundations: DONE (committed)

- `src/application/ports/timer-configuration-repository.port.ts` — added `getById(id): Promise<TimerConfiguration>` (1.1)
- `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts` — added `getById` mock (1.2)
- `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts` + `__tests__/` — `getById`: happy path, not-found, SSR-routes-to-not-found (1.3)
- `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` + `__tests__/` — `getById`: `GET {baseUrl}/{id}` + Bearer header, `ensureOk` 404→not-found, shared `parseBody` DTO validation (1.4)
- `src/application/use-cases/get-timer-configuration/get-timer-configuration.ts` + `__tests__/` — passthrough to `repository.getById` (1.5)
- `src/lib/duration.ts` + `__tests__/duration.test.ts` — `formatDuration`/`splitDuration`/`toTotalSeconds` (1.6)
- `src/ui/components/shadcn/{button,input,switch}.tsx` — vendored (1.7)

## Slice 2a — Result module + list + delete actions: DONE (uncommitted, ready for PR)

- `src/application/timer-configuration/timer-configuration-result.ts` + `__tests__/timer-configuration-result.test.ts` (new) — `TimerConfigurationErrorCode`, `Result<T>`, `toTimerConfigurationErrorCode(error)` reading `_tag`, mirrors `google-login.action.ts`'s `toErrorCode` pattern exactly. 4 TDD steps, all green: `InvalidTimerConfiguration`→`invalid-configuration`, `TimerConfigurationNotFound`→`not-found`, unrecognized `Error`→`unknown`, non-Error thrown value→`unknown` (2.1, done)
- `src/infraestructure/actions/list-timer-configuration/list-timer-configuration.action.ts` + `__tests__/` (new) — `listTimerConfigurationsAction()`. Structural precedent followed: `"use server"`, `createCookieSessionAdapter().get()` guard first (no session → `unauthenticated`, adapter never constructed), `createBackendTimerConfigurationAdapter(session.token)` in try/catch (`unknown` on throw), `listTimerConfigurations({ repository })()` in try/catch mapping rejections via `toTimerConfigurationErrorCode`. 4 TDD steps, all green (2.2, done)
- `src/infraestructure/actions/delete-timer-configuration/delete-timer-configuration.action.ts` + `__tests__/` (new) — `deleteTimerConfigurationAction(id: string)`. Same shape plus a zod `z.string()` boundary shape-check on `id` BEFORE any session/adapter work (malformed input never touches the repository); catches `timerConfigurationNotFound` via the shared mapper into `{ok:false, code:"not-found"}`; success → `{ok:true, data:null}`. 4 TDD steps, all green (2.3, done)

**Learned**: No deviation from design D2/D6 — both actions use the `Action` suffix and the identical 4-step body shape (shape-check → session guard → adapter construction try/catch → use-case try/catch). `toTimerConfigurationErrorCode` only needed 2 explicit `_tag` branches (`InvalidTimerConfiguration`, `TimerConfigurationNotFound`) with `unknown` as the catch-all — no `BackendUnavailable`-style third tag exists in this error domain, unlike `google-login`'s `toErrorCode`. Zod input validation for the delete action's `id: string` is a shape-only check (per the migrate-timer-configurations precedent) — the `not-found` business outcome is left entirely to the repository/use-case layer, not zod.

**Status**: `npm run test` → 177/177 passed (32 files, up from 165/29 after slice 1). `npx tsc --noEmit` → clean. `npm run lint` → 0 errors, same 9 pre-existing `_id` unused-var warnings (unrelated, predate this batch). `npx prettier --check` on all 6 new files → clean.

## Slice 2b — Create + update actions: NOT STARTED

## Slice 3 — List screen: NOT STARTED

## Slice 4 — Form screen: NOT STARTED

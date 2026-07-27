# Design: Timer Configuration Screens (issue #21)

## Technical Approach

Wire the existing timer stack to the UI without touching domain or the 4 existing use cases. One shared ops hook (`useTimerConfigurations`) owns the auth/guest branch; both branches run the SAME application use case (validation parity), differing only in which repository backs it: Server Action + backend adapter (auth) vs. injected local adapter (guest, A1). Every route is a Server Component composition root that resolves the session and passes a serializable `isAuthenticated` flag down. Nothing throws across the RSC boundary — actions return `Result<T>`.

## Architecture Decisions

### D1 — Guest branch goes through use cases, not the adapter directly

**Choice**: guest hook calls `createTimerConfiguration({ repository: localAdapter })(candidate)`.
**Rejected**: `localAdapter.create(...)` directly (precedent: migration-runner hook).
**Rationale**: `validateTimerConfiguration` lives in the use case. Calling the adapter directly would skip validation for guests only — a silent correctness split between the two paths.

### D2 — Serializable `Result<T>` taxonomy in `application/`

**Choice**: `src/application/timer-configuration/timer-configuration-result.ts` exports `TimerConfigurationErrorCode`, `Result<T>`, and `toTimerConfigurationErrorCode(error)` (reads `_tag`, mirrors `google-login.action.ts`'s `toErrorCode`).
**Rejected**: duplicating the mapper in each action; putting it in `infraestructure/`.
**Rationale**: 5 consumers (4 actions + the guest hook branch). A `"use server"` file may not export non-async values, so it cannot live in an action file. Placing it in `application/` keeps the UI import legal (UI→application is allowed; UI→infra is not, outside the 3 sanctioned exceptions).

### D3 — Edit lookup is server-side for auth, client-side for guest — `getById` stays OUT of the ops hook

**Choice**: `/timers/[id]/edit` fetches via `getTimerConfiguration({ repository: backendAdapter })(id)` server-side and passes `initialConfiguration`; for guests it passes `null` and the form hook resolves it with the same use case over the injected `localAdapter`.
**Rejected**: a 5th `get-timer-configuration` Server Action (breaks the confirmed 4-action decision); putting `getById` in the ops hook (leaves a dead/unreachable auth branch).
**Rationale**: keeps the ops surface exactly symmetric with the 4 actions, gives authenticated users an SSR pre-filled form and a real `notFound()` 404, and needs no extra action.

### D4 — New passthrough use case `get-timer-configuration`

**Choice**: add it (mirrors `list`/`delete`, which are also passthroughs).
**Rejected**: calling `repository.getById(id)` from the page/hook.
**Rationale**: the codebase's standing convention is "every port call goes through a use case". One 12-line file preserves it. Minor expansion of the proposal's "no new use cases" (which was about behavior changes, not wiring).

### D5 — No server-side seeding of the LIST

**Choice**: `/timers` renders and the list component fetches client-side for both auth and guest.
**Rejected**: SSR-seed the auth list.
**Rationale**: guests cannot be served server-side, so a client load path is mandatory anyway; seeding only auth would mean two code paths for one screen. Accepted tradeoff: one round-trip before first paint for authenticated users. Revisit only if measured.

### D6 — Action names get an `Action` suffix

**Choice**: `listTimerConfigurationsAction`, `createTimerConfigurationAction`, etc.
**Rejected**: the no-suffix precedent (`migrateTimerConfigurations`, `googleLogin`).
**Rationale**: `use-timer-configurations.ts` imports both the action and the identically-named use case. Suffix avoids an aliased import in every branch.

### D7 — Rounds minimum is 1

Derived from `validateTimerConfiguration`'s `rounds <= 0` rule: smallest valid integer is 1. Decrement disabled at 1; manual typing clamps `NaN`/empty/`<1` to 1. No max (13+ is ELITE).

## Data Flow

```
                     app/timers/**/page.tsx  (Server Component, force-dynamic)
                       └─ getCurrentSession(createCookieSessionAdapter())
                          └─ isAuthenticated: boolean  ──serializable──┐
                                                                       v
                                             timer-configuration-{list,form}.tsx
                                                          └─ .hook.ts  (A2: all calls here)
                                                                 └─ useTimerConfigurations(isAuthenticated, localAdapter?)
                    auth ┌──────────────────────────────────────────────┴──────────────────────┐ guest
                         v                                                                     v
   {list,create,update,delete}TimerConfigurationAction        useCase({ repository: localAdapter })
     └─ zod shape check → session.get() → backendAdapter        └─ try/catch → Result<T>
        └─ useCase({ repository }) → Result<T>                     (localStorage)
```

Both branches return the identical `Result<T>`, so the component hooks never know which one ran.

## File Changes

| File                                                                                                           | Action | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/application/ports/timer-configuration-repository.port.ts`                                                 | Modify | add `getById(id): Promise<TimerConfiguration>` (`@throws TimerConfigurationNotFound`)                                                  |
| `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts`                               | Modify | `getById` = `GET ${baseUrl}/${id}` + `ensureOk(response, id)` + `parseBody(..., timerConfigurationDtoSchema)` + `toTimerConfiguration` |
| `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts`                                 | Modify | `getById` = `readAll().find(c => c.id === id)`, else `throw timerConfigurationNotFound(id)`                                            |
| `.../timer-configuration/__tests__/{backend,local}-*.adapter.test.ts`                                          | Modify | add `getById` describe blocks                                                                                                          |
| `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts`                                  | Modify | add `getById: vi.fn().mockResolvedValue(buildTimerConfiguration())`                                                                    |
| `src/application/use-cases/get-timer-configuration/get-timer-configuration.ts` (+ `__tests__/`)                | New    | passthrough to `repository.getById`                                                                                                    |
| `src/application/timer-configuration/timer-configuration-result.ts` (+ `__tests__/`)                           | New    | `Result<T>`, `TimerConfigurationErrorCode`, `toTimerConfigurationErrorCode`                                                            |
| `src/lib/duration.ts` (+ `__tests__/`)                                                                         | New    | `formatDuration(s): "m:ss"`, `splitDuration(s): {minutes,seconds}`, `toTotalSeconds(min, sec): number`                                 |
| `src/infraestructure/actions/list-timer-configuration/list-timer-configuration.action.ts` (+ `__tests__/`)     | New    | Server Action                                                                                                                          |
| `src/infraestructure/actions/create-timer-configuration/create-timer-configuration.action.ts` (+ `__tests__/`) | New    | Server Action                                                                                                                          |
| `src/infraestructure/actions/update-timer-configuration/update-timer-configuration.action.ts` (+ `__tests__/`) | New    | Server Action                                                                                                                          |
| `src/infraestructure/actions/delete-timer-configuration/delete-timer-configuration.action.ts` (+ `__tests__/`) | New    | Server Action                                                                                                                          |
| `src/ui/hooks/use-timer-configurations.ts` (+ `__tests__/`)                                                    | New    | the single auth/guest branch (shared hook → `ui/hooks/`, precedent `use-google-auth.ts`)                                               |
| `src/ui/components/timer-configuration-list/{*.tsx,*.hook.ts,*.types.ts,index.ts,__tests__/}`                  | New    | list screen: load, optimistic delete, empty state                                                                                      |
| `src/ui/components/timer-configuration-card/{*.tsx,*.types.ts,index.ts}`                                       | New    | presentational card (no hook, no test)                                                                                                 |
| `src/ui/components/timer-configuration-form/{*.tsx,*.hook.ts,*.types.ts,index.ts,__tests__/}`                  | New    | shared create/edit form                                                                                                                |
| `src/ui/components/rounds-stepper/{*.tsx,*.hook.ts,*.types.ts,index.ts,__tests__/}`                            | New    | +/- stepper, min 1                                                                                                                     |
| `src/ui/components/shadcn/{button,input,switch}.tsx`                                                           | New    | `npx shadcn add`, then moved manually (`components.json` `aliases.ui` stays `@/ui/components` — Issue #5 owns that migration)          |
| `src/app/timers/page.tsx` (+ `__tests__/page.test.tsx`)                                                        | New    | list composition root                                                                                                                  |
| `src/app/timers/new/page.tsx` (+ `__tests__/`)                                                                 | New    | create composition root                                                                                                                |
| `src/app/timers/[id]/edit/page.tsx` (+ `__tests__/`)                                                           | New    | edit composition root, first dynamic route                                                                                             |
| `src/app/page.tsx` (+ `__tests__/page.test.tsx`)                                                               | Modify | add `/timers` link                                                                                                                     |

## Interfaces / Contracts

```ts
// application/timer-configuration/timer-configuration-result.ts
export type TimerConfigurationErrorCode =
  | "invalid-configuration" // InvalidTimerConfiguration
  | "not-found"             // TimerConfigurationNotFound
  | "unauthenticated"       // no session server-side
  | "unknown";              // network / non-2xx / misconfig
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: TimerConfigurationErrorCode };
export function toTimerConfigurationErrorCode(error: unknown): TimerConfigurationErrorCode;

// application/ports/timer-configuration-repository.port.ts (added)
getById(id: string): Promise<TimerConfiguration>;

// infraestructure/actions/** — all 4, "use server", never throw
listTimerConfigurationsAction(): Promise<Result<TimerConfiguration[]>>;
createTimerConfigurationAction(c: Omit<TimerConfiguration, "id">): Promise<Result<TimerConfiguration>>;
updateTimerConfigurationAction(c: TimerConfiguration): Promise<Result<TimerConfiguration>>;
deleteTimerConfigurationAction(id: string): Promise<Result<null>>;

// ui/hooks/use-timer-configurations.ts
export interface TimerConfigurationOperations {
  list(): Promise<Result<TimerConfiguration[]>>;
  create(c: Omit<TimerConfiguration, "id">): Promise<Result<TimerConfiguration>>;
  update(c: TimerConfiguration): Promise<Result<TimerConfiguration>>;
  remove(id: string): Promise<Result<null>>;
}
// A1: module-level `const defaultLocalAdapter = createLocalTimerConfigurationAdapter()`
// (browser-only, non-serializable, cannot cross the RSC boundary) exposed as an
// overridable last param so tests inject a fake at the port boundary.
export function useTimerConfigurations(
  isAuthenticated: boolean,
  localAdapter: TimerConfigurationRepositoryPort = defaultLocalAdapter
): TimerConfigurationOperations; // useMemo([isAuthenticated, localAdapter])
```

**Action body shape (identical in all 4)**: zod boundary shape-check of the input (trust boundary — same discipline as `migrate-timer-configurations.action.ts`; the `>0` business rule stays in the domain) → `createCookieSessionAdapter().get()`, `null` → `{ ok:false, code:"unauthenticated" }` → `createBackendTimerConfigurationAdapter(session.token)` in try/catch (missing `BACKEND_URL` throws synchronously) → `{ ok:false, code:"unknown" }` → run the use case in try/catch → `{ ok:true, data }` or `toTimerConfigurationErrorCode(e)`. No `redirect()` inside actions — the form hook navigates client-side with `useRouter().push("/timers")`, so one navigation path serves both branches.

**Guest never reaches a Server Action**: `useTimerConfigurations` is the only caller, and its `isAuthenticated === false` branch never references an action. Defense in depth: a forged guest call still hits the `unauthenticated` gate and is a no-op.

**Form state** (`timer-configuration-form.hook.ts`):

```ts
{
  name: string;
  rounds: number;
  roundMinutes: string;
  roundSeconds: string; // strings so a cleared field is not NaN mid-typing
  restMinutes: string;
  restSeconds: string;
  warnBeforeEnd: boolean;
  bellSound: boolean;
}
```

Edit pre-fill: `splitDuration(config.roundDuration)`. Submit: `toTotalSeconds(roundMinutes, roundSeconds)`.
Signature: `useTimerConfigurationForm({ isAuthenticated, initialConfiguration, timerId }, localAdapter = defaultLocalAdapter)` — it forwards that same adapter into `useTimerConfigurations`, so one instance is injectable in one place. Guest edit: `getTimerConfiguration({ repository: localAdapter })(timerId)`; `TimerConfigurationNotFound` → `router.replace("/timers")`.

**Validation surfacing**: two layers.

- Inline per-field (`fieldErrors: { roundDuration?: string; restDuration?: string }`) computed on submit attempt when a combined total is `<= 0`; blocks dispatch. Rounds cannot be invalid — the stepper clamps to `>= 1`.
- Summary (`formError: string | null`) fed by the `Result` code through an `ERROR_CODE_COPY: Record<TimerConfigurationErrorCode, string>` (same pattern as `login-card.hook.ts`), covering `invalid-configuration` (defence in depth), `not-found`, `unauthenticated`, `unknown`.

## Testing Strategy

Strict TDD: failing test first, one behavior per test, titles start with `should`, AAA with blank lines, mocks at port boundaries only. Presentational `.tsx` files are NOT tested. Hook tests use `renderHook` with `// @vitest-environment jsdom`.

| Test file                                                                      | Covers                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.../timer-configuration/__tests__/backend-*.adapter.test.ts`                  | `getById` hits `GET {baseUrl}/{id}` with the Bearer header; maps 404 → `TimerConfigurationNotFound`; non-2xx → generic `Error`; invalid body → generic `Error`                                                                             |
| `.../__tests__/local-*.adapter.test.ts`                                        | `getById` returns the stored record; throws `TimerConfigurationNotFound` when absent or storage empty                                                                                                                                      |
| `use-cases/get-timer-configuration/__tests__/`                                 | delegates to `repository.getById`; propagates `TimerConfigurationNotFound`                                                                                                                                                                 |
| `application/timer-configuration/__tests__/timer-configuration-result.test.ts` | each `_tag` → its code; unknown/non-error → `"unknown"`                                                                                                                                                                                    |
| `lib/__tests__/duration.test.ts`                                               | `formatDuration` pads seconds (`90 → "1:30"`, `5 → "0:05"`); `splitDuration`/`toTotalSeconds` round-trip; `toTotalSeconds` treats empty/`NaN` as 0                                                                                         |
| `actions/*/__tests__/*.action.test.ts` (×4)                                    | returns `unauthenticated` with no session; `unknown` when the adapter factory throws; `ok:true` on success; maps use-case throws to codes; malformed input rejected without touching the repository; never throws                          |
| `ui/hooks/__tests__/use-timer-configurations.test.ts`                          | auth → calls the action, never the injected adapter; guest → calls the use case over the injected adapter, never the action; guest failures become `Result` (never throw); ops identity stable across re-renders                           |
| `timer-configuration-list/__tests__/*.hook.test.ts`                            | loads on mount; exposes empty state when `[]`; optimistic delete removes before resolution; restores the row and sets an error when delete fails                                                                                           |
| `timer-configuration-form/__tests__/*.hook.test.ts`                            | pre-fills split minutes/seconds in edit; combines to total seconds on submit; blocks submit and sets `fieldErrors` on zero duration; `router.push("/timers")` on success; maps failure codes to copy; guest edit of a missing id redirects |
| `rounds-stepper/__tests__/*.hook.test.ts`                                      | increments; decrements; will not go below 1; clamps typed empty/`NaN`/`0` to 1                                                                                                                                                             |
| `app/timers*/__tests__/page.test.tsx` (×3)                                     | passes `isAuthenticated` true/false without redirecting for guests; edit page awaits `params`, seeds `initialConfiguration` for auth, calls `notFound()` on `TimerConfigurationNotFound`, passes `null` for guest                          |
| `app/__tests__/page.test.tsx`                                                  | the `/timers` link renders                                                                                                                                                                                                                 |

Next.js 16: `params` is a Promise — `const { id } = await props.params`, typed with the global `PageProps<"/timers/[id]/edit">` helper. All three routes set `export const dynamic = "force-dynamic"` (they reach `cookies()` through the session adapter, which fails closed to `null` before calling it — see the comment in `src/app/page.tsx`).

## Migration / Rollout

No data migration. Purely additive except the `/timers` link and the non-breaking `getById` port addition. Rollback = revert the branch.

## PR Slicing (chained, each slice depends only on earlier ones)

| #   | Slice          | Contents                                                                                                                                                                      | Budget risk                                                                                                 |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Foundations    | port `getById` + both adapters + port mock + their tests; `get-timer-configuration` use case + test; `src/lib/duration.ts` + test; shadcn `button`/`input`/`switch`           | Medium (~150 hand-written + ~200 vendored shadcn — flag the vendored split in the PR body)                  |
| 2   | Server Actions | `timer-configuration-result.ts` + test; 4 action folders + tests                                                                                                              | **High (~450)** — split into 2a (`list` + `delete`) / 2b (`create` + `update`) if the reviewer budget bites |
| 3   | List screen    | `use-timer-configurations` + test; `timer-configuration-list` (+hook+test); `timer-configuration-card`; `app/timers/page.tsx` + test; `/timers` link in `app/page.tsx` + test | Medium (~350)                                                                                               |
| 4   | Form screen    | `rounds-stepper` (+hook+test); `timer-configuration-form` (+hook+test); `app/timers/new` and `app/timers/[id]/edit` + tests                                                   | **High (~450)** — split into 4a (`rounds-stepper` + `/timers/new`) / 4b (`/timers/[id]/edit`) if needed     |

Dependencies: 2 needs only the `Result` module (self-contained); 3 needs 1 (`formatDuration`) + 2 (actions); 4 needs 1 (`splitDuration`/`toTotalSeconds`, `get-timer-configuration`, shadcn input/switch), 2 (create/update), 3 (`useTimerConfigurations`). No slice depends on a later one. `useTimerConfigurations` sits in slice 3 rather than 2 so it lands with its first consumer.

## Open Questions

None blocking. Two flagged tradeoffs: (a) D5 accepts one client round-trip before the auth list paints; (b) slices 2 and 4 are forecast above the 400-line budget with a documented split path.

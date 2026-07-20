# Design: Local + Backend adapters for TimerConfigurationRepository (Issue #19)

## Context

Issue #18 merged `TimerConfigurationRepositoryPort` (`create` / `list` / `update` / `delete`),
the `TimerConfiguration` domain model, its errors, and use cases — but no adapter fulfills the
port. This change delivers the two concrete adapters plus a minimal `localStorage` utility, all
mirroring the auth slice precedent (`src/infraestructure/auth/`). No new abstraction, no new
dependency. Scope is already user-approved (see proposal `sdd/timer-configuration-adapters/proposal`).

The only existing backend-adapter precedent is `backend-auth.adapter.ts`: factory function reading
`BACKEND_URL` inline (fail-closed if unset), raw `fetch` in try/catch, status-code branching, Zod
`safeParse` on the DTO, separate DTO→domain mapper. We mirror that exact mechanical shape.

## Architecture approach

Hexagonal driven adapters. Both adapters are outbound (driven) implementations of the same
application port. They live in a single per-slice folder `src/infraestructure/timer-configuration/`,
matching the auth slice layout (`infraestructure/auth/` holds both its adapters + `dto/` + `mappers/`

- `__tests__/`). Flat files directly under `infraestructure/` is rejected: the auth precedent groups
  a slice's adapters/dto/mappers under one folder, and this slice has two adapters + dto + mappers —
  grouping keeps them cohesive and discoverable.

The `localStorage` access utility is deliberately NOT a port (single consumer; no shared `fetch`
wrapper exists either). It is a plain function module under `src/infraestructure/storage/`, reused by
the local adapter.

## Component map

```
src/infraestructure/
├── storage/
│   ├── local-storage.util.ts                 # NEW plain functions, SSR-guarded JSON access
│   └── __tests__/
│       └── local-storage.util.test.ts        # NEW jsdom
└── timer-configuration/
    ├── local-timer-configuration.adapter.ts  # NEW port impl over local-storage.util
    ├── backend-timer-configuration.adapter.ts# NEW port impl over fetch
    ├── dto/
    │   └── timer-configuration.dto.ts         # NEW Zod schema + inferred DTO type
    ├── mappers/
    │   ├── timer-configuration.mapper.ts       # NEW DTO→domain mapper
    │   └── __tests__/
    │       └── timer-configuration.mapper.test.ts  # NEW node
    └── __tests__/
        ├── local-timer-configuration.adapter.test.ts    # NEW jsdom
        └── backend-timer-configuration.adapter.test.ts  # NEW node (stubs fetch)
```

## Data flow

- **Guest / local**: UI hook (future) → `createLocalTimerConfigurationAdapter()` → `local-storage.util`
  → browser `localStorage` (single JSON blob).
- **Logged-in / backend**: Server Component composition root (future) → `createBackendTimerConfigurationAdapter()`
  → `fetch` `/api/v1/timer-configurations` → Zod `safeParse` (DTO) → mapper → domain `TimerConfiguration`.

Both return/accept the identical domain types the port declares; DTO shape never leaks past the mapper.

## Interface contracts

### `local-storage.util.ts`

```ts
export function getItem<T>(key: string): T | undefined; // SSR/malformed/absent → undefined
export function setItem<T>(key: string, value: T): void; // SSR → no-op
export function removeItem(key: string): void; // SSR → no-op
```

- SSR guard: `typeof window === "undefined"` → `getItem` returns `undefined`, `setItem`/`removeItem` no-op.
- `getItem` JSON-parses inside try/catch; malformed JSON → `undefined` (never throws).

### `local-timer-configuration.adapter.ts`

```ts
export function createLocalTimerConfigurationAdapter(): TimerConfigurationRepositoryPort;
```

- Storage strategy: **single JSON blob** — one key `"timer-configurations"` holding
  `TimerConfiguration[]`. Rejected: one key per id — `list()` would have to enumerate/scan
  `localStorage` keys by prefix (fragile, more code); the blob makes `list()` a single read+parse.
  `ponytail:` single blob, revisit only if a config set ever outgrows the ~5MB localStorage budget.
- `create(config)`: read blob (default `[]`), assign `id = crypto.randomUUID()`, push, `setItem`, return the stored record.
- `list()`: return blob or `[]`.
- `update(config)`: read blob; if no entry matches `config.id` → throw `timerConfigurationNotFound(config.id)`; else replace, `setItem`, return.
- `delete(id)`: read blob; filter out `id`; if length unchanged → throw `timerConfigurationNotFound(id)`; else `setItem`.

### `backend-timer-configuration.adapter.ts`

```ts
export function createBackendTimerConfigurationAdapter(): TimerConfigurationRepositoryPort;
```

- Reads `process.env.BACKEND_URL` inline at factory time; if unset → throw (fail-closed, mirrors auth). See D-Errors below for the thrown error.
- Base path: `${BACKEND_URL}/api/v1/timer-configurations`.

| Op       | HTTP           | Request body                  | Success                                    | Not-found                              | Other failure        |
| -------- | -------------- | ----------------------------- | ------------------------------------------ | -------------------------------------- | -------------------- |
| `list`   | `GET /`        | —                             | 200 → `TimerConfigurationDto[]` → map each | —                                      | throw (see D-Errors) |
| `create` | `POST /`       | domain config (no id) as JSON | 200/201 → `TimerConfigurationDto` → map    | —                                      | throw                |
| `update` | `PUT /{id}`    | domain config as JSON         | 200 → `TimerConfigurationDto` → map        | 404 → `timerConfigurationNotFound(id)` | throw                |
| `delete` | `DELETE /{id}` | —                             | 204 (no body)                              | 404 → `timerConfigurationNotFound(id)` | throw                |

- Each response body validated with Zod `safeParse` before mapping; validation failure → throw (see D-Errors).
- Request bodies are the domain objects sent directly via `JSON.stringify` (no domain→DTO mapper): DTO and domain are identical flat primitives, so a request mapper would be identity. Only a DTO→domain **response** mapper exists (validates + isolates), exactly as auth had only `toSession` and inlined its `{ idToken }` request.

### `dto/timer-configuration.dto.ts`

```ts
export const timerConfigurationDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  rounds: z.number(),
  roundDuration: z.number(),
  restDuration: z.number(),
  warnBeforeEnd: z.boolean(),
  bellSound: z.boolean(),
});
export type TimerConfigurationDto = z.infer<typeof timerConfigurationDtoSchema>;
```

### `mappers/timer-configuration.mapper.ts`

```ts
export function toTimerConfiguration(
  dto: TimerConfigurationDto
): TimerConfiguration;
```

Identity-shaped field copy; kept as a named function per precedent so the DTO type never leaks
past the mapper and the boundary stays explicit.

## Decisions (ADR-style)

### D1 — Per-slice folder `infraestructure/timer-configuration/`

- **Decision**: group both adapters + `dto/` + `mappers/` + `__tests__/` under one `kebab-case` slice folder.
- **Rationale**: mirrors the ONLY backend-adapter precedent (`infraestructure/auth/`), which groups exactly these pieces. Cohesion + discoverability.
- **Rejected**: flat files under `infraestructure/` — breaks the established slice-folder shape and scatters dto/mappers.

### D2 — `localStorage` as plain util, not a port

- **Decision**: `storage/local-storage.util.ts`, three plain generic functions.
- **Rationale**: single consumer; no shared `fetch` wrapper exists either. YAGNI — promote to a port only when a second real consumer appears. User-approved.
- **Rejected**: `StoragePort` + adapter — one-implementation interface, speculative.

### D3 — Single JSON blob for local storage

- **Decision**: one key holds the full `TimerConfiguration[]`.
- **Rationale**: `list()` becomes one read+parse; keyed-per-id needs prefix key-scanning (fragile, more code).
- **Rejected**: one key per id.

### D4 — `crypto.randomUUID()` for local `create()` ids

- **Decision**: generate ids with `crypto.randomUUID()`.
- **Rationale**: available in browsers and Node 19+ (project runs Node ≥19; Vitest node/jsdom envs both expose `globalThis.crypto`). No new dependency. Backend-assigned ids come from the server, so this only affects the local adapter.
- **Verify**: local adapter tests run under jsdom — confirm `crypto.randomUUID` is present there (it is, provided by Node's global `crypto`).

### D5 — HTTP 404 → `timerConfigurationNotFound(id)`

- **Decision**: map `response.status === 404` on `update`/`delete` to `timerConfigurationNotFound(id)`.
- **Rationale**: standard REST not-found default; the port explicitly `@throws` this error for missing records.
- **Assumption (verify against real backend)**: the backend returns 404 (not 400/409/200-with-flag) for a missing record. Single point of change if wrong — same fail-safe posture as `backend-auth.adapter.ts` picking 401/403 for its own domain. Flagged as a risk.

### D6 — Non-404 backend failures throw a generic `Error` (no new domain error)

- **Decision**: network failure, non-404 non-2xx status, non-JSON body, and Zod validation failure all `throw` — and missing `BACKEND_URL` at factory time throws — using a plain `Error` with a descriptive message. No typed timer "backend unavailable" error is introduced.
- **Rationale**: the timer domain has no `backendUnavailable` error and the proposal puts domain/errors changes OUT of scope. The port only guarantees `timerConfigurationNotFound` for missing records; it makes no typed promise for transport failures. A generic `Error` satisfies the contract without expanding scope.
- **Rejected**: reuse `backendUnavailable` from `auth-errors.ts` — couples the timer slice to the auth domain's error taxonomy (Hexagonal violation; that error even defaults its message to "Auth backend unavailable").
- **Deferred**: a dedicated `timerBackendUnavailable` domain error should be added later — when a UI consumer (#ui-management) actually needs to branch "not found" vs "backend down" for messaging. YAGNI until then.

### D7 — Response-only mapper; request bodies sent as domain objects

- **Decision**: only `toTimerConfiguration` (DTO→domain) exists; requests `JSON.stringify` the domain object directly.
- **Rationale**: DTO and domain are identical flat primitives → a domain→DTO request mapper is pure identity boilerplate. Auth precedent likewise had only a response mapper.

## Composition-root wiring (design note only — NOT wired here)

No consuming route exists yet; wiring lands with #ui-management. When it does:

- **Logged-in path**: an `app/` Server Component (composition root) reads the session cookie; when a
  session exists it constructs `createBackendTimerConfigurationAdapter()` server-side and passes the
  data (or the use cases wired to it) down. The backend adapter is server-composable because it only
  touches `fetch` + `process.env`.
- **Guest path**: no session → the local adapter is browser-only (`localStorage` touches `window`),
  so it is structurally unreachable from a Server Component and cannot cross the RSC boundary as a
  serializable prop. It is constructed client-side inside a UI hook via the **A1 exception**
  (overridable parameter with a module-level default factory, justified in that PR), exactly as
  `gsi-loader.adapter.ts` is consumed by `useGoogleAuth`.
- **Selection point**: the "session present?" branch that chooses backend vs local lives in that
  future composition root, not in either adapter. Documented, not executed.

## Test plan

| File                                                                        | Env                            | Covers                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage/__tests__/localStorage.test.ts`                                    | `// @vitest-environment jsdom` | round-trip set/get, absent→undefined, malformed JSON→undefined, remove, SSR no-op guard                                                                                                                                                                                                    |
| `timer-configuration/__tests__/local-timer-configuration.adapter.test.ts`   | `// @vitest-environment jsdom` | create assigns id + persists, list returns all, update replaces, update-missing→`timerConfigurationNotFound`, delete removes, delete-missing→`timerConfigurationNotFound`                                                                                                                  |
| `timer-configuration/__tests__/backend-timer-configuration.adapter.test.ts` | node (default)                 | factory throws when `BACKEND_URL` unset; each op hits the right URL/method/body; 200 maps via DTO; 404 on update/delete→`timerConfigurationNotFound`; network reject / 500 / malformed DTO→throws. Stubs `fetch` via `vi.stubGlobal`/`vi.stubEnv` (mirrors `backend-auth.adapter.test.ts`) |
| `timer-configuration/mappers/__tests__/timer-configuration.mapper.test.ts`  | node (default)                 | DTO→domain field mapping                                                                                                                                                                                                                                                                   |

Tests follow AGENTS.md: `__tests__/` siblings, `should …` titles, Arrange-Act-Assert, mock only at
the port/`fetch` boundary, deterministic (no real network/timers). Local-storage tests reset the
store between cases.

## Risks

- Backend not-found HTTP status is an unverified assumption (404) — no non-auth precedent confirms it. Single point of change (D5).
- `crypto.randomUUID()` presence under the jsdom test env — expected present via Node global `crypto`; confirm during implementation (D4).
- Non-404 failure ergonomics: generic `Error` is intentionally coarse until #ui-management needs typed branching (D6).

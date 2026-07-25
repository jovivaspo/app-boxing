# Design: Migrate Local Timer Configurations on Login (Issue #20)

## Technical Approach

Implements proposal Approach 2. A new client-only gate component mounted in
`src/app/page.tsx` reads guest localStorage configs, calls a new dedicated
Server Action `migrateTimerConfigurations`, then deletes locally only the ids
the backend accepted. Auth code (`googleLogin`, `signInWithGoogle`) is
untouched. The port stays unchanged; the correlation problem is solved with an
action-level DTO that echoes the local `id`.

## Architecture Decisions

### Decision: Action DTO echoes the local `id` (not a port change)

| Option                                                                                                      | Tradeoff                                                                 | Decision   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| Change port `create` to keep `id`                                                                           | Breaks the "backend assigns id" contract, touches shipped adapters/tests | Rejected   |
| Correlate by array index                                                                                    | Fragile, silent misalignment if backend reorders                         | Rejected   |
| Action input = `TimerConfiguration[]` (with local id); output = `{ id, status }[]` echoing the **local** id | Zero port change; explicit correlation                                   | **Chosen** |

Rationale: the backend `create` return (a new backend id) is irrelevant to the
client — the client only needs to know which **local** entry to delete. The
action strips `id` when calling the use case and echoes the local `id` in the
result. The port contract is preserved verbatim.

### Decision: Blocking gate as an own client component wrapping page content

| Option                                              | Tradeoff                                                               | Decision   |
| --------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| Logic inline in `page.tsx`                          | `page.tsx` is a Server Component; can't read localStorage; violates A2 | Rejected   |
| Client wrapper component hosting the migration hook | Adds one component; localStorage read is client-only; honors A2        | **Chosen** |

`page.tsx` (Server Component composition root) wraps its authenticated `<main>`
in `<TimerConfigurationMigrationGate>`. The gate is `"use client"`; while
migration is pending it renders `null` (blocking, silent — no spinner per
product decision), then renders `children` once every item resolves. Children
are server-rendered nodes passed as a prop (standard RSC pattern).

### Decision: Fail-closed conditions degrade to "migrate later"

Missing session (`get()` → `null`) or missing `BACKEND_URL`
(`createBackendTimerConfigurationAdapter` throws synchronously) both collapse to
"return every item as `failed`". Nothing is deleted locally → retried next
login. The action never throws, so the page never crashes.

## Data Flow

    page.tsx (RSC) ──children──▶ MigrationGate (client)
                                      │ hook: useTimerConfigurationMigration
                        local.list() ─┤ (A1 override param, module default)
                                      ▼
                        migrateTimerConfigurations(configs)  [Server Action]
                          session.get() ─▶ backendAdapter(token) ─▶ createTimerConfiguration
                          per-item try/catch ─▶ [{ id, status }]
                                      │
                        local.delete(id) for status==="migrated"
                                      ▼
                        setDone(true) ─▶ gate renders children

## File Changes

| File                                                                                                             | Action | Description                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action.ts`                | Create | `"use server"` action; loops per item with independent try/catch; fail-closed → all `failed`             |
| `src/infraestructure/actions/migrate-timer-configurations/__tests__/migrate-timer-configurations.action.test.ts` | Create | `vi.mock` session/backend-adapter/use-case; cover no-session, no-BACKEND_URL, mixed results, empty input |
| `src/ui/components/timer-configuration-migration-gate/timer-configuration-migration-gate.tsx`                    | Create | Presentational: renders `children` when settled, else `null`. Not tested                                 |
| `src/ui/components/timer-configuration-migration-gate/timer-configuration-migration-gate.hook.ts`                | Create | `"use client"` hook: local read, action call (A2), delete-on-success; A1 override param                  |
| `src/ui/components/timer-configuration-migration-gate/timer-configuration-migration-gate.types.ts`               | Create | Props + hook result types                                                                                |
| `src/ui/components/timer-configuration-migration-gate/index.ts`                                                  | Create | Barrel                                                                                                   |
| `src/ui/components/timer-configuration-migration-gate/__tests__/timer-configuration-migration-gate.hook.test.ts` | Create | jsdom; inject fake local adapter; mock action module                                                     |
| `src/app/page.tsx`                                                                                               | Modify | Wrap authenticated `<main>` in `<TimerConfigurationMigrationGate>`                                       |
| `src/app/__tests__/page.test.tsx`                                                                                | Modify | Update assertions for the new gate wrapper                                                               |

## Interfaces / Contracts

```typescript
// migrate-timer-configurations.action.ts
export interface MigratedItemResult {
  id: string; // the LOCAL id, echoed back for delete correlation
  status: "migrated" | "failed";
}
// "use server"
export async function migrateTimerConfigurations(
  configs: TimerConfiguration[] // full local configs, each carrying local id
): Promise<MigratedItemResult[]>;
// session null OR BACKEND_URL missing → configs.map(c => ({ id: c.id, status: "failed" }))
// per item: const { id, ...candidate } = config; strip id before use case;
//           echo config.id on the result.

// timer-configuration-migration-gate.hook.ts
const defaultLocalAdapter = createLocalTimerConfigurationAdapter(); // A1 module default
export function useTimerConfigurationMigration(
  localAdapter: TimerConfigurationRepositoryPort = defaultLocalAdapter // A1 override
): { isMigrating: boolean };
```

Hook effect: `list()` → if empty, settle immediately; else call action, then
`delete(id)` (best-effort `.catch(() => {})`) for each `migrated`, then settle.

## Testing Strategy

| Layer                   | What to Test                                                                                                           | Approach                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Infrastructure (action) | no-session/all-failed, no-BACKEND_URL/all-failed, mixed per-item, id echo, empty input, never throws                   | `vi.mock` modules + dynamic `import` (google-login pattern) |
| UI (hook)               | empty local → no action call; migrated ids deleted; failed ids kept; delete error swallowed; `isMigrating` transitions | `renderHook` + jsdom, inject fake adapter, mock action      |
| UI (gate `.tsx`)        | —                                                                                                                      | Not tested (project rule)                                   |

## Migration / Rollout

No data migration/schema/flag. Idempotent via per-item delete-on-success:
repeated logins never duplicate; partial failures retained for next login.
Rollback = revert the new files and the `page.tsx` wrapper; local data intact.

## Open Questions

- [ ] None blocking. Deferred correlation decision resolved above (action DTO
      echoes local `id`).

---

## Revision (PR #29 pre-merge fixes)

Two verified `claude-pr-review` findings, fixed before merge. All original
decisions remain valid **except** "Blocking gate as an own client component",
which is **superseded by R1**. The migration logic itself (Web Locks mutual
exclusion, delete-on-success idempotency, fail-closed session/`BACKEND_URL`) is
**not** touched — only render gating (R1) and Server Action input handling (R2)
change.

### R1 — Supersedes "Blocking gate": render unconditionally, migrate in background

**Finding (confirmed):** `TimerConfigurationMigrationGate` initializes
`isMigrating = true` and only flips it inside a `useEffect` (never runs during
SSR), returning `null` while pending. Result: the authenticated `/` route
renders blank HTML on SSR and **permanently** for no-JS clients — the entire
`<main>` (greeting, "Ver perfil" link, logout) is omitted on _every_
authenticated load, not just when there is something to migrate. Blast radius
far exceeds the originally accepted "delay on large local sets" risk.

**Product decision (reversal):** the home page shows no data that depends on the
migration having completed; blocking had only precautionary value. Render page
content immediately and always; run migration as a fire-and-forget background
effect.

| Option                                                                                                            | Tradeoff                                                                                                                                 | Decision   |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Keep gate, just render `children` unconditionally (drop `if (isMigrating) return null`)                           | Smallest diff, but keeps dead `isMigrating` state, the misleading "gate" name, and children passed through a client boundary for nothing | Rejected   |
| Remove `isMigrating`; component renders `null` with no `children`; `page.tsx` renders `<main>` + a sibling runner | Net deletion; honest name; strongest SSR/no-JS guarantee (content lives in the RSC, no client wrapper around it)                         | **Chosen** |

Decisions:

- **Drop `isMigrating` (YAGNI).** Nothing consumes it once gating is removed. The
  hook becomes a pure side-effect hook returning `void`; delete
  `UseTimerConfigurationMigrationResult` and `TimerConfigurationMigrationGateProps`.
- **Rename `...-gate` → `...-runner` (`TimerConfigurationMigrationRunner`).**
  "Gate" names the exact blocking behavior being deleted; keeping it would be
  actively misleading — a future maintainer could reasonably re-add blocking and
  reintroduce this regression. The files are new/unmerged in this PR, so the
  rename cost is contained to the open PR with zero main-history or downstream
  impact.
- **Migration logic unchanged.** Web Locks mutual exclusion, delete-on-success
  idempotency, and fail-closed handling stay verbatim — only render gating and
  the now-dead state are removed.

Revised data flow:

    page.tsx (RSC)
      ├──▶ <main> …content…                 (always rendered, SSR/no-JS safe)
      └──▶ <TimerConfigurationMigrationRunner/>  (client, renders null)
                    │ hook: useTimerConfigurationMigration()
                    ▼
             navigator.locks.request(...)  ─▶ local.list()
                    ─▶ migrateTimerConfigurations(configs)  ─▶ delete migrated ids
    (no render depends on migration completing)

### R2 — Server Action input cap + boundary shape validation

**Finding (confirmed):** `migrateTimerConfigurations` is a network-callable POST
endpoint for any client holding a valid session cookie — not restricted to the
gate hook. It has no cap on `configs.length` and no shape validation before
`Promise.all(configs.map(...))` fans out one backend `create()` per item, so an
authenticated caller could submit an oversized array to cheaply amplify
load/cost against the backend.

| Concern                          | Fix                                                                                                            | Decision   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| Unbounded fan-out (DoS)          | `MAX_MIGRATION_BATCH = 50` constant; guard `configs.length > MAX` before session lookup → `allFailed(configs)` | **Chosen** |
| Malformed items reaching backend | Zod v4 per-item `safeParse` inside `migrateOne`; invalid item → `failed` (kept local)                          | **Chosen** |

Rationale:

- **Cap = single constant, checked first.** `50` is generous headroom over
  realistic guest preset counts (single digits to low tens) while capping
  amplification. Over-cap → whole batch resolves `failed` (fail-closed,
  consistent with the existing never-throws contract; nothing deleted locally,
  retried next login). Checked _before_ `createCookieSessionAdapter().get()` so
  a malicious oversized call triggers no cookie IO and no backend calls. Not
  configurable — YAGNI.
- **Zod shape validation at the action boundary (not a new layer).** Per the
  hexagonal skill, a Server Action must validate its untrusted payload with Zod
  in infrastructure. This is the boundary shape/type check the action currently
  lacks — **complementary to, not duplicating,** the domain
  `validateTimerConfiguration` business rule (`> 0`) that already runs per item
  inside `createTimerConfiguration`. Zod validates field presence/type only;
  the domain keeps the positivity rule (no rule duplication / drift). This
  closes the real gap where `undefined <= 0 === false` lets an item missing a
  numeric field slip past domain validation and reach the backend.
- **Per-item, not whole-array.** `safeParse` each item inside `migrateOne`
  preserves the existing partial resilience (one corrupt localStorage entry
  does not sink the batch); a whole-array `z.array(schema).parse` would
  fail-close the entire batch on any single malformed item.

Guard order in the action becomes: empty → `[]`; over-cap → `allFailed`; then
session, adapter, and the existing per-item flow. Never throws; the public
contract (`TimerConfiguration[]` → `MigratedItemResult[]`) is preserved.

### Revised File Changes

| File                                                                                                  | Action     | Change                                                                                         |
| ----------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `src/ui/components/timer-configuration-migration-gate/` → `.../timer-configuration-migration-runner/` | **Rename** | Folder and all files renamed `-gate` → `-runner`                                               |
| `.../timer-configuration-migration-runner.tsx`                                                        | Modify     | Render `null`; drop `children`/props; call the hook for its side effect only                   |
| `.../timer-configuration-migration-runner.hook.ts`                                                    | Modify     | Remove `isMigrating` state, return `void`; migration body (locks/list/action/delete) unchanged |
| `.../timer-configuration-migration-runner.types.ts`                                                   | **Delete** | No types remain (props + result interfaces both removed)                                       |
| `.../index.ts`                                                                                        | Modify     | Export `TimerConfigurationMigrationRunner`                                                     |
| `.../__tests__/timer-configuration-migration-runner.hook.test.ts`                                     | Modify     | Drop `isMigrating` transition assertions; keep behavior tests                                  |
| `src/app/page.tsx`                                                                                    | Modify     | Render `<main>` directly + `<TimerConfigurationMigrationRunner/>` sibling (no wrapper)         |
| `src/app/__tests__/page.test.tsx`                                                                     | Modify     | Assert content renders unconditionally (SSR/no-JS safe) + runner mounted                       |
| `.../migrate-timer-configurations.action.ts`                                                          | Modify     | Add `MAX_MIGRATION_BATCH` const + length guard; add Zod schema + per-item `safeParse`          |
| `.../__tests__/migrate-timer-configurations.action.test.ts`                                           | Modify     | Cover cap-exceeded → all-failed, malformed item → failed, valid siblings still migrated        |

### Revised Testing Strategy

| Layer                   | What to Test (added/changed)                                                                                                                                                                                  | Approach                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Infrastructure (action) | cap-exceeded (e.g. 51 items) → all `failed`, no session/backend call; malformed item (missing `rounds`) → `failed`, valid siblings `migrated`; existing no-session/no-BACKEND_URL/empty/never-throws retained | `vi.mock` modules + dynamic `import`      |
| UI (runner hook)        | empty local → no action call; migrated ids deleted; failed ids kept; delete error swallowed; Web Locks guard. **Remove** `isMigrating` test                                                                   | `renderHook` + jsdom, inject fake adapter |
| UI (page)               | greeting/`<main>` rendered unconditionally (no client JS needed); runner mounted — proves the SSR/no-JS regression is closed                                                                                  | Server Component render assertions        |

### Revised Open Questions

- [ ] None blocking. `MigratedItemResult.id: string` type nit remains deferred
      (out of scope, previously accepted).

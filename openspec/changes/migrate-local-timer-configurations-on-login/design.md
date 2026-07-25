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

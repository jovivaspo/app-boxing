# Design: Guest Timer Single Config Simplification

Issue: #37
Engram topic: `sdd/guest-timer-single-config/design`
Depends on: `sdd/guest-timer-single-config/proposal` (confirmed, obs #133/#134)

## Summary

Replace the guest (unauthenticated) timer's array-shaped, id-addressed
localStorage CRUD with a single-record `read()/write()/clear()` adapter over
a new port (`GuestTimerConfigurationPort`), narrower than the existing
`TimerConfigurationRepositoryPort`. The authenticated flow (backend adapter,
Server Actions, use-cases, `TimerConfigurationRepositoryPort` itself) is
untouched — only the guest branch inside three existing hooks changes, plus
three whole folders/files are deleted.

`TimerConfiguration`'s domain shape is unchanged. No Zod/DTO changes. No
route file changes (`app/timers/new`, `app/timers/[id]/edit`,
`app/timers/[id]/active` keep passing `timerId`/`initialConfiguration` exactly
as today).

## D1 — New port: `GuestTimerConfigurationPort` (replaces guest use of `TimerConfigurationRepositoryPort`)

`src/application/ports/guest-timer-configuration.port.ts` (new file):

```typescript
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export type GuestTimerConfigurationInput = Omit<
  TimerConfiguration,
  "id" | "name"
>;

export interface GuestTimerConfigurationPort {
  /** Returns the guest's single stored timer configuration, or null if none exists yet. */
  read(): Promise<TimerConfiguration | null>;
  /**
   * Persists the guest's single timer configuration — creates it (fresh id)
   * on first write, overwrites it (same id, fixed name) on every later call.
   * @throws {import("@/domain/errors/timer-configuration-errors").InvalidTimerConfiguration} rounds, roundDuration, or restDuration is <= 0.
   */
  write(candidate: GuestTimerConfigurationInput): Promise<TimerConfiguration>;
  /** Removes the stored record entirely (guest "start over"). Never throws. */
  clear(): Promise<void>;
}
```

Rationale for a new port instead of reusing `TimerConfigurationRepositoryPort`:
the proposal explicitly drops the `create/list/getById/update/delete` CRUD
surface for guests in favor of `read()/write()`. Reusing the 5-method port
would keep dead surface area (`list`, `getById` by arbitrary id) that no
longer means anything once there's exactly one record. `id` and `name` are
excluded from the write input type because both are adapter-owned, never
caller-supplied (id is generated once and reused; name is always the fixed
placeholder) — the type system enforces this instead of a runtime check.

**Deviation from the proposal's literal wording (flagged, not hidden):** the
proposal's Approach section says "a `read()/write()` pair," omitting delete.
`clear()` is added because `TimerConfigurationList`/`TimerConfigurationCard`
already render a delete button unconditionally for every item regardless of
auth state, and that list screen is not in the "route files unaffected"
exclusion list — only `new`/`[id]/edit`/`[id]/active` are. Without `clear()`,
`ops.remove(id)` has nothing to call for guests and the existing delete
button would silently no-op or need to be hidden. Rejected alternative:
thread an `isAuthenticated` prop into `TimerConfigurationCard` to hide the
delete button for guests — rejected because it touches two more
presentational components for a worse guest experience (no way to reset),
versus a 3-line adapter method.

## D2 — `local-timer-configuration.adapter.ts`: single-record read/write

```typescript
import { validateTimerConfiguration } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type {
  GuestTimerConfigurationInput,
  GuestTimerConfigurationPort,
} from "@/application/ports/guest-timer-configuration.port";
import {
  getItem,
  setItem,
  removeItem,
} from "@/infraestructure/storage/localStorage";

const STORAGE_KEY = "guest-timer";
const GUEST_TIMER_NAME = "Mi Timer";

/**
 * Creates the `GuestTimerConfigurationPort` implementation backed by
 * `localStorage` — single JSON record under `STORAGE_KEY`, never the old
 * array-shaped `"timer-configurations"` key (abandoned, never read again).
 */
export function createLocalTimerConfigurationAdapter(): GuestTimerConfigurationPort {
  return {
    async read(): Promise<TimerConfiguration | null> {
      return getItem<TimerConfiguration>(STORAGE_KEY) ?? null;
    },

    async write(
      candidate: GuestTimerConfigurationInput
    ): Promise<TimerConfiguration> {
      if (typeof window === "undefined") {
        throw new Error(
          "Cannot save guest timer configuration: localStorage is unavailable (SSR)"
        );
      }

      // Domain validation still runs even though no application use case is
      // involved for guests — infra depending on domain is the permitted
      // direction (Dependency Rule), so this preserves "guest data is never
      // persisted invalid" without needing the full repository port.
      const validated = validateTimerConfiguration({
        ...candidate,
        name: GUEST_TIMER_NAME,
      });
      const existing = getItem<TimerConfiguration>(STORAGE_KEY);
      const config: TimerConfiguration = {
        ...validated,
        name: GUEST_TIMER_NAME,
        id: existing?.id ?? crypto.randomUUID(),
      };
      setItem(STORAGE_KEY, config);
      return config;
    },

    async clear(): Promise<void> {
      removeItem(STORAGE_KEY);
    },
  };
}
```

Key points:

- `id` is generated once (first `write()`) and reused on every subsequent
  `write()` — this is what makes "creating another overwrites, not appends"
  true, and it's also why the guest's `/timers/[id]/edit` and
  `/timers/[id]/active` URLs (built from `config.id` in
  `TimerConfigurationCard`) keep working: the id in the URL always matches
  the one stored record, because both come from the same `list()` result.
- `read()` never rejects (mirrors `getItem`'s existing "never throws"
  contract) — this removes the try/catch guest-lookup boilerplate entirely
  from both consuming hooks (see D3/D4).
- `write()` still throws `InvalidTimerConfiguration` for `rounds`/
  `roundDuration`/`restDuration` <= 0, same as the authenticated path,
  preserving the "no invalid guest data persisted" invariant without the
  removed `createTimerConfiguration`/`updateTimerConfiguration` use-cases.

## D3 — `use-timer-configurations.ts`: guest branch maps to read/write/clear

```typescript
const defaultLocalAdapter = createLocalTimerConfigurationAdapter(); // now returns GuestTimerConfigurationPort

function toGuestTimerInput(
  config: Omit<TimerConfiguration, "id"> | TimerConfiguration
): GuestTimerConfigurationInput {
  const { name: _name, ...rest } = config as TimerConfiguration;
  const { id: _id, ...input } = rest as TimerConfiguration;
  return input;
}

export function useTimerConfigurations(
  isAuthenticated: boolean,
  localAdapter: GuestTimerConfigurationPort = defaultLocalAdapter
): TimerConfigurationOperations {
  return useMemo<TimerConfigurationOperations>(() => {
    if (isAuthenticated) {
      /* unchanged — Server Actions */
    }

    return {
      list: () =>
        toGuestResult(async () => {
          const stored = await localAdapter.read();
          return stored ? [stored] : [];
        }),
      create: (config) =>
        toGuestResult(() => localAdapter.write(toGuestTimerInput(config))),
      update: (config) =>
        toGuestResult(() => localAdapter.write(toGuestTimerInput(config))),
      remove: () => toGuestResult(() => localAdapter.clear().then(() => null)),
    };
  }, [isAuthenticated, localAdapter]);
}
```

`TimerConfigurationOperations` (the public interface consumed by
`TimerConfigurationList`/`TimerConfigurationForm`) is **unchanged** — `list`
still returns `Result<TimerConfiguration[]>` (0 or 1 item for guests),
`create`/`update` both resolve to the same overwritten record, `remove`
ignores its `id` argument for guests (there is only one record; the
authenticated branch still uses `id` via the Server Action). This is why no
route files or the list-screen hook/component need any change.

## D4 — `timer-active.hook.ts`: inline single-record resolution, no more `useGuestTimerConfigurationLookup`

```typescript
const defaultLocalAdapter = createLocalTimerConfigurationAdapter(); // GuestTimerConfigurationPort now

export function useTimerActive(
  { isAuthenticated, initialConfiguration, timerId }: TimerActiveProps,
  deps: TimerActiveDeps = {}
): UseTimerActiveResult {
  const bell = deps.bell ?? defaultBell;
  const localAdapter = deps.localAdapter ?? defaultLocalAdapter;
  const router = useRouter();

  const [guestConfig, setGuestConfig] = useState<TimerConfiguration | null>(
    null
  );
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (isAuthenticated || !timerId || initialConfiguration) return;

    let cancelled = false;
    localAdapter.read().then((stored) => {
      if (cancelled) return;
      if (stored) {
        setGuestConfig(stored);
      } else {
        setConfigError(true);
        router.replace("/timers");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, timerId, initialConfiguration, localAdapter, router]);

  const config = initialConfiguration ?? guestConfig;
  // ...rest of the hook (tick effect, start/pause/resume/stop, status derivation) unchanged
}
```

`timerId` stays a prop (routes still pass it) — it's used only as the
existing "is this an edit-like guest route" gate (`!timerId` skips the
effect entirely, same as today), never for id-based lookup: `read()` always
resolves the one stored record regardless of what `timerId` says. No
try/catch needed since `read()` never rejects — the old `getById()` +
`timerConfigurationNotFound` + catch block is gone entirely, replaced by a
plain `stored ? ... : ...` branch.

## D5 — `timer-configuration-form.hook.ts`: same inline pattern

```typescript
const defaultLocalAdapter = createLocalTimerConfigurationAdapter(); // GuestTimerConfigurationPort now

export function useTimerConfigurationForm(
  {
    isAuthenticated,
    initialConfiguration,
    timerId,
  }: TimerConfigurationFormProps,
  localAdapter: GuestTimerConfigurationPort = defaultLocalAdapter
): UseTimerConfigurationFormResult {
  // ...form state as today...

  useEffect(() => {
    if (isAuthenticated || !timerId || initialConfiguration) return;
    let cancelled = false;
    localAdapter.read().then((stored) => {
      if (cancelled) return;
      if (stored) setForm(toFormState(stored));
      else router.replace("/timers");
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, timerId, initialConfiguration, localAdapter, router]);

  // handleSubmit, editingId, setName/setRounds/etc. all unchanged —
  // ops.create/ops.update both route to the same write() under the hood,
  // and editingId (still `initialConfiguration?.id ?? timerId`) is
  // harmless for guests since write() ignores whatever id ends up in the
  // candidate object.
}
```

**Why not a shared hook (again):** `useGuestTimerConfigurationLookup` is
being deleted, not replaced by an equivalently-shaped hook. Its old job (id
lookup + not-found domain error handling) doesn't exist anymore — there is
no id-based branching left to share, and the two call sites already differ
in what they do with the resolved value (`setGuestConfig` vs.
`setForm(toFormState(...))`), which would just re-introduce the removed
hook's `onResolved` callback shape. Two ~10-line effects are simpler than a
new shared abstraction with a callback parameter.

## D6 — Guest form hides the name field (presentational split, A2)

`timer-configuration-form.tsx` (presentational, no logic change beyond a
conditional block) already receives `isAuthenticated` as a prop — no new
hook field needed:

```tsx
export function TimerConfigurationForm(props: TimerConfigurationFormProps) {
  const { form, /* ... */ } = useTimerConfigurationForm(props);

  return (
    <form onSubmit={handleSubmit} /* ... */>
      {formError && <p ...>{formError}</p>}

      {props.isAuthenticated && (
        <div className="flex flex-col gap-2">
          <label htmlFor="name" ...>Nombre del Timer</label>
          <input
            type="text"
            id="name"
            value={form.name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="EJ. SACO PESADO"
            className="..."
          />
        </div>
      )}

      {/* rest of the form unchanged */}
    </form>
  );
}
```

This is plain conditional rendering on an existing prop, not new business
logic — no A2 violation (A2 is about Server-Action/infra calls staying out
of `.tsx`, which this doesn't touch). `form.name` still holds whatever the
hook set it to (`""` for a fresh guest form, `"Mi Timer"` after a guest
edit-lookup resolves) but is simply never rendered for guests; it's stripped
by `toGuestTimerInput` before reaching `write()` regardless, so an unused,
always-"Mi Timer"-or-empty internal field is harmless. No `TimerConfiguration
FormState` type change needed.

## Removal list

| Path                                                                                                     | Why safe to delete                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/actions/migrate-timer-configurations/` (action + `__tests__/`)                      | Sole caller is `timer-configuration-migration-runner.hook.ts`, deleted in the same change. Grep confirms no other importer.                                                                              |
| `src/ui/components/timer-configuration-migration-runner/` (component + hook + `index.ts` + `__tests__/`) | Sole caller is `src/app/page.tsx`, which drops the import/JSX in this same change. Grep confirms no other importer.                                                                                      |
| `src/ui/hooks/use-guest-timer-configuration-lookup.ts` + its `__tests__/`                                | Sole callers are `timer-active.hook.ts` and `timer-configuration-form.hook.ts`, both refactored (D4/D5) in this same change to inline single-record resolution instead. Grep confirms no other importer. |

Verified via grep across `src/` for `migrateTimerConfigurations`,
`useTimerConfigurationMigration`, `TimerConfigurationMigrationRunner`, and
`useGuestTimerConfigurationLookup` before writing this list — each has
exactly the callers named above, no dangling references once the three
consuming files are edited in the same commit.

## Test impact

**Deleted alongside removed code** (no replacement — the behavior is gone,
not moved):

- `src/infraestructure/actions/migrate-timer-configurations/__tests__/migrate-timer-configurations.action.test.ts`
- `src/ui/components/timer-configuration-migration-runner/__tests__/timer-configuration-migration-runner.hook.test.ts`
- `src/ui/hooks/__tests__/use-guest-timer-configuration-lookup.test.ts`

**Rewritten (behavior/shape changed, TDD: failing test first)**:

- `src/infraestructure/timer-configuration/__tests__/local-timer-configuration.adapter.test.ts` — full rewrite: `read()`/`write()`/`clear()` over `localStorage` key `"guest-timer"`; assert fixed name `"Mi Timer"` is always applied regardless of candidate input; assert the id is stable across repeated `write()` calls (create-then-overwrite semantics); assert `write()` rejects with `InvalidTimerConfiguration` for non-positive `rounds`/`roundDuration`/`restDuration`; assert `read()` resolves `null` (never rejects) both when nothing is stored and under SSR (`window === undefined`); assert `write()` still throws the SSR guard error; assert nothing under the old `"timer-configurations"` key is ever read.
- `src/ui/hooks/__tests__/use-timer-configurations.test.ts` — guest-branch tests switch from `makeTimerConfigurationRepositoryPort()` to a new `makeGuestTimerConfigurationPort()` mock (`read`/`write`/`clear`); `list()` guest test asserts `read()` is called and result is array-wrapped; `create`/`update` guest tests both assert `write()` is called (not two different use-cases); `remove` guest test asserts `clear()` is called, ignoring the `id` argument. Authenticated-path tests (Server Action assertions) are unchanged.
- `src/ui/components/timer-active/__tests__/timer-active.hook.test.ts` — every call site currently passes `localAdapter: makeTimerConfigurationRepositoryPort()` (including tests that never exercise the guest path, just to satisfy the prop's type) — all switch to `makeGuestTimerConfigurationPort()`. The two guest-specific tests ("resolve the guest configuration ... using timerId" and "redirect a guest to /timers when the configuration is not found") are rewritten: mock `read()` instead of `getById()`, assert `read()` is called (no `.toHaveBeenCalledWith("tc-1")` — the id is no longer passed to the adapter), and the not-found case mocks `read()` resolving `null` instead of rejecting with `timerConfigurationNotFound`.
- `src/ui/components/timer-configuration-form/__tests__/timer-configuration-form.hook.test.ts` — same mock swap (`makeTimerConfigurationRepositoryPort()` → `makeGuestTimerConfigurationPort()`) across all 15 occurrences; guest lookup assertions updated from `getById` to `read()` the same way as timer-active's.
- `src/app/__tests__/page.test.tsx` — remove the `useTimerConfigurationMigration` mock and the "renders ... regardless of the migration runner's hook return" assertion tied to it; keep the redirect and session-render tests.

**New mock file (not a test itself, but required by the above rewrites)**:

- `src/application/ports/__mocks__/guest-timer-configuration-port.mock.ts` — `makeGuestTimerConfigurationPort(overrides?)` returning `{ read: vi.fn().mockResolvedValue(null), write: vi.fn().mockResolvedValue(buildTimerConfiguration()), clear: vi.fn().mockResolvedValue(undefined), ...overrides }`, mirroring the existing `timer-configuration-repository-port.mock.ts` pattern.

**Unaffected — no changes**:

- `src/application/use-cases/{create,update,delete,list,get}-timer-configuration/__tests__/*` — these use-cases are still exercised unchanged by the authenticated path.
- `src/infraestructure/actions/{create,update,delete,list}-timer-configuration/__tests__/*.action.test.ts` — authenticated Server Actions untouched.
- `src/infraestructure/timer-configuration/__tests__/backend-timer-configuration.adapter.test.ts`, `mappers/__tests__/timer-configuration.mapper.test.ts` — backend adapter/mapper untouched.
- `src/domain/timer-configuration/__tests__/timer-configuration.model.test.ts`, `src/domain/errors/__tests__/timer-configuration-errors.test.ts` — domain untouched.
- `src/ui/components/timer-configuration-list/__tests__/timer-configuration-list.hook.test.ts` — mocks `useTimerConfigurations` at the `TimerConfigurationOperations` boundary (unchanged interface), never touches the local adapter directly.
- `src/app/timers/__tests__/page.test.tsx`, `src/app/timers/new/__tests__/page.test.tsx`, `src/app/timers/[id]/edit/__tests__/page.test.tsx`, `src/app/timers/[id]/active/__tests__/page.test.tsx` — route composition-root tests mock `TimerConfigurationForm`/`TimerActive`/`TimerConfigurationList` at the component boundary, not the guest adapter.
- `src/infraestructure/storage/__tests__/localStorage.test.ts` — the `getItem`/`setItem`/`removeItem` utility itself is unchanged (still used by the new adapter, now also using `removeItem` for `clear()`).

## Interface/type changes summary

| Symbol                                                                                     | Change                                                                                  |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `GuestTimerConfigurationPort` (new, `application/ports/guest-timer-configuration.port.ts`) | `read()/write()/clear()`, replaces guest use of `TimerConfigurationRepositoryPort`      |
| `GuestTimerConfigurationInput` (new, same file)                                            | `Omit<TimerConfiguration, "id" \| "name">`, input type for `write()`                    |
| `createLocalTimerConfigurationAdapter()` return type                                       | `TimerConfigurationRepositoryPort` → `GuestTimerConfigurationPort`                      |
| `TimerActiveDeps.localAdapter` (`timer-active.types.ts`)                                   | `TimerConfigurationRepositoryPort` → `GuestTimerConfigurationPort`                      |
| `useTimerConfigurationForm`'s 2nd param                                                    | `TimerConfigurationRepositoryPort` → `GuestTimerConfigurationPort`                      |
| `useTimerConfigurations`'s 2nd param                                                       | `TimerConfigurationRepositoryPort` → `GuestTimerConfigurationPort`                      |
| `makeGuestTimerConfigurationPort` (new mock)                                               | `application/ports/__mocks__/guest-timer-configuration-port.mock.ts`                    |
| `TimerConfiguration` (domain model)                                                        | **Unchanged** — no fields added/removed, per proposal                                   |
| `TimerConfigurationRepositoryPort`                                                         | **Unchanged** — still the authenticated/backend contract                                |
| `TimerConfigurationOperations` (`use-timer-configurations.ts`)                             | **Unchanged** — `list/create/update/remove` shape stays identical for both branches     |
| `TimerConfigurationFormProps`, `TimerActiveProps`                                          | **Unchanged** — `timerId?: string` stays as the route-gate signal, not an id-lookup key |

## Risks / open items

- `clear()` is an addition beyond the proposal's literal "read/write pair" —
  flagged above (D1) with rationale; worth a quick nod from whoever reviews
  the proposal-vs-design diff, though it doesn't change any acceptance
  criterion (guest still ends up with 0 or 1 records either way).
- The 15-occurrence mechanical mock swap in `timer-active.hook.test.ts` and
  `timer-configuration-form.hook.test.ts` is repetitive but low-risk —
  flagging so tasks phase doesn't underestimate the line count of "just
  rename a mock."

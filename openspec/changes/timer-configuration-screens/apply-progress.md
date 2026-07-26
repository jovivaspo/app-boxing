# Apply Progress: Timer Configuration Screens (issue #21)

**What**: Slice 1 (Foundations) — committed. Slice 2a (Result module + list + delete Server Actions) — committed. Slice 2b (create + update Server Actions) — committed. Slice 3 (List screen) — fully implemented, ready to commit as its own PR-sized unit (targets `main`, since 2a+2b are merged, per stacked-to-main).

**Why**: Wire the existing timer-configuration stack (port/adapters/use-cases/actions from slices 1-2) to a user-facing `/timers` list screen reachable by both authenticated and guest identities, per the confirmed tasks artifact (obs #105) and design (obs #104).

## Slice 1 — Foundations: DONE (committed)

See prior revisions — port `getById`, both adapters, mock, `get-timer-configuration` use case, `src/lib/duration.ts`, vendored shadcn `button`/`input`/`switch`.

## Slice 2 (2a + 2b) — Server Actions: DONE (committed)

`src/application/timer-configuration/timer-configuration-result.ts` (+test), `src/infraestructure/actions/{list,delete,create,update}-timer-configuration/` (+tests). Tasks 2.1-2.5 done.

## Slice 3 — List screen: DONE (ready to commit)

- `src/ui/hooks/use-timer-configurations.ts` + `__tests__/use-timer-configurations.test.ts` (new) — `useTimerConfigurations(isAuthenticated, localAdapter = defaultLocalAdapter): TimerConfigurationOperations` exposing `list/create/update/remove`. Auth branch calls the 4 Server Actions directly. Guest branch (D1) runs the SAME application use cases (`listTimerConfigurations`, `createTimerConfiguration`, `updateTimerConfiguration`, `deleteTimerConfiguration`) over the injected local adapter, never `localAdapter.xxx()` directly, wrapped in a `toGuestResult` helper mapping thrown errors to `Result` via `toTimerConfigurationErrorCode` (never throws). `remove()` maps the use case's `Promise<void>` to `Result<null>`. Memoized via `useMemo([isAuthenticated, localAdapter])`. `defaultLocalAdapter` is a module-level `createLocalTimerConfigurationAdapter()` singleton (A1), overridable last param. 10 tests, all green (task 3.1).
- `src/ui/components/timer-configuration-list/{timer-configuration-list.tsx, .hook.ts, .types.ts, index.ts}` + `__tests__/timer-configuration-list.hook.test.ts` (new) — `.hook.ts` (`useTimerConfigurationList(isAuthenticated)`) owns all logic (A2): loads via `useTimerConfigurations(isAuthenticated).list()` on mount, `isEmpty` flag when `[]`, optimistic delete (removes the row from state immediately, calls `ops.remove(id)`, restores the row + sets an error string on failure). `.tsx` is presentational only. 4 tests, all green (task 3.2).
- `src/ui/components/timer-configuration-card/{timer-configuration-card.tsx, .types.ts, index.ts}` (new) — presentational only, no hook, no test (task 3.3). Renders name, level badge (`calculateTimerLevel`), rounds, `formatDuration`-formatted work/rest durations, an "Editar" link to `/timers/{id}/edit` (404s until slice 4 lands — expected), and an "Eliminar" delete button.
- `src/app/timers/page.tsx` + `__tests__/page.test.tsx` (new) — `force-dynamic` composition root resolving `session` via `getCurrentSession`, passing `isAuthenticated={session !== null}`. Deliberately does NOT redirect when no session exists — guest access is the point. 2 tests, all green (task 3.4).
- `src/app/page.tsx` (modified) + its `__tests__/page.test.tsx` (modified) — added a "Mis Timers" link. 1 new test, all green (task 3.5).

**Learned**: No deviation from design. Mocked `useTimerConfigurations` in the list hook test must return a referentially STABLE `ops` object across calls to mirror the real hook's `useMemo` guarantee — otherwise the mount effect re-fires on every re-render.

**Status**: `npm run test` → 203/203 passed (37 files, up from 186/34 pre-slice-3). `npx tsc --noEmit` → clean. `npm run lint` → 0 errors, 13 warnings (same pre-existing `_id` pattern, +1 following it, not a regression).

## Slice 4 — Form screen: NOT STARTED

## Delivery decisions (CONFIRMED by user, 2026-07-26)

- **delivery_strategy**: `ask-on-risk`
- **Slice 2 (Server Actions)**: SPLIT into 2 chained PRs — **2a** (2.1 Result module + 2.2 list action + 2.3 delete action, ~230 lines) and **2b** (2.4 create action + 2.5 update action, ~220 lines). Clean split, no cross-half coupling.
- **Slice 4 (Form screen)**: NOT split — ships as ONE PR (~450 lines) with an accepted `size:exception`, because any split leaves an uneven, dependency-tangled division (`timer-configuration-form` is shared by both `/timers/new` and `/timers/[id]/edit`).
- **chain_strategy**: `stacked-to-main` — each PR in the change targets the immediately previous PR's branch in sequence, merging to main individually as each is approved. PR sequence: Slice 1 → Slice 2a → Slice 2b → Slice 3 → Slice 4.

## Apply status

- **Slice 1 (Foundations)**: [x] COMPLETE — tasks 1.1-1.7 all done. `npm run test` 165/165, `npx tsc --noEmit` clean, `npm run lint` 0 errors. Committed.
- **Slice 2a (Result module + list + delete actions)**: [x] COMPLETE — tasks 2.1, 2.2, 2.3 all done. `npm run test` 177/177, `npx tsc --noEmit` clean, `npm run lint` 0 errors. Committed.
- **Slice 2b (create + update actions)**: [x] COMPLETE — tasks 2.4, 2.5 all done. `npm run test` 186/186, `npx tsc --noEmit` clean, `npm run lint` 0 errors (3 new pre-existing-pattern warnings, no regression). Committed. Slice 2 (Server Actions) fully COMPLETE.
- **Slice 3 (List screen)**: [x] COMPLETE — tasks 3.1-3.5 all done. `npm run test` 203/203, `npx tsc --noEmit` clean, `npm run lint` 0 errors. Committed.
- **Slice 4 (Form screen)**: [x] COMPLETE — tasks 4.1-4.4 all done. `npm run test` 218/218, `npx tsc --noEmit` clean, `npm run lint` 0 errors. Ready to commit (accepted `size:exception`, actual ~1020 lines vs ~450 forecast — mostly test verbosity). **Issue #21 task list 100% complete.**

# Tasks: Timer Configuration Screens (Issue #21)

Strict TDD throughout: failing test first, then minimal implementation, one behavior per test, `should` titles, AAA with blank lines. Mocks only at port boundaries. Presentational `.tsx` files are never tested — only their hooks.

Legend: **[spec]** = requirement satisfied. **[P]** = can run in parallel with sibling tasks at the same indent once its own listed dependency is met. **[S]** = must run sequentially (later depends on earlier in same slice).

## Slice 1 — Foundations [x] COMPLETE

**Depends on**: nothing (first slice). **Enables**: 2 (indirectly, via Result module being independent), 3 (duration.ts), 4 (duration.ts, get-timer-configuration, shadcn input/switch).

1.1 [S] Modify `src/application/ports/timer-configuration-repository.port.ts`: add `getById(id: string): Promise<TimerConfiguration>` to the interface. **[spec: TimerConfigurationRepositoryPort port contract — getById is part of the required contract]**

- No dedicated test file (interface-only, compile-time enforcement is the scenario).

1.2 [S] Modify `src/application/ports/__mocks__/timer-configuration-repository-port.mock.ts`: add `getById: vi.fn().mockResolvedValue(buildTimerConfiguration())`. Depends on 1.1.

1.3 [P, depends on 1.1+1.2] Local adapter `getById` — `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts` + `__tests__/local-timer-configuration.adapter.test.ts`:
1.3.1 Failing test: "should resolve with the matching record when getById is called with a stored id" → implement `readAll().find(c => c.id === id)` happy path. **[spec: getById returns a matching record]**
1.3.2 Failing test: "should reject with timerConfigurationNotFound when no record matches" → implement the `throw timerConfigurationNotFound(id)` branch. **[spec: getById rejects when no record matches]**
1.3.3 Failing test: "should reject with timerConfigurationNotFound when window is undefined (SSR)" → confirm/adjust to route through the same not-found branch when the storage utility treats the store as empty. **[spec: No window available (SSR) — getById rejects]**

1.4 [P, depends on 1.1+1.2] Backend adapter `getById` — `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` + `__tests__/backend-timer-configuration.adapter.test.ts`:
1.4.1 Failing test: "should issue GET {baseUrl}/{id} with the Bearer header and resolve with the mapped configuration" → implement `fetch(GET, baseUrl/id)` + `parseBody(..., timerConfigurationDtoSchema)` + `toTimerConfiguration`. **[spec: getById fetches a single record]**
1.4.2 Failing test: "should reject with timerConfigurationNotFound when the backend responds 404" → implement `ensureOk(response, id)` reuse for the 404 branch. **[spec: getById maps 404 to not-found]**
1.4.3 Failing test: "should reject with a generic Error when the response body fails DTO validation" → confirm/adjust shared `parseBody` path covers `getById` too. **[spec: Response fails DTO validation]**

1.5 [S, depends on 1.1] New use case `src/application/use-cases/get-timer-configuration/get-timer-configuration.ts` + `__tests__/`:
1.5.1 Failing test: "should delegate to repository.getById with the given id" → implement passthrough.
1.5.2 Failing test: "should propagate TimerConfigurationNotFound thrown by the repository" → confirm passthrough does not swallow the rejection.

1.6 [P, independent] `src/lib/duration.ts` + `__tests__/duration.test.ts`:
1.6.1 Failing test: `formatDuration(90)` → `"1:30"` → implement `formatDuration`.
1.6.2 Failing test: `formatDuration(5)` → `"0:05"` (zero-padding) → adjust implementation.
1.6.3 Failing test: `splitDuration(90)` → `{ minutes: 1, seconds: 30 }` → implement `splitDuration`.
1.6.4 Failing test: `toTotalSeconds(1, 30)` → `90` → implement `toTotalSeconds`.
1.6.5 Failing test: `toTotalSeconds` treats empty/`NaN` inputs as `0` → adjust implementation.

1.7 [P, independent] Vendor shadcn primitives: `npx shadcn add button input switch`, then move generated files from wherever `components.json` currently points into `src/ui/components/shadcn/{button,input,switch}.tsx`. No test (vendored code). Flag the vendored line count separately in the PR body — do not count it against the hand-written budget.

## Slice 2 — Server Actions (SPLIT: 2a then 2b, stacked-to-main)

**Depends on**: nothing from Slice 1 except general repo state (self-contained per design: "2 needs only the Result module"). **Enables**: 3 (list/delete actions), 4 (create/update actions).

### 2a — Result module + list + delete actions (PR targets main) [x] COMPLETE

2.1 [S] `src/application/timer-configuration/timer-configuration-result.ts` + `__tests__/timer-configuration-result.test.ts`:
2.1.1 Failing test: "should map an error tagged InvalidTimerConfiguration to the invalid-configuration code" → implement `toTimerConfigurationErrorCode` first branch.
2.1.2 Failing test: "should map an error tagged TimerConfigurationNotFound to the not-found code" → add branch.
2.1.3 Failing test: "should map an unrecognized error to the unknown code" → add fallback branch.
2.1.4 Failing test: "should map a non-Error thrown value to the unknown code" → confirm fallback handles non-Error inputs.

2.2 [P, depends on 2.1] `src/infraestructure/actions/list-timer-configuration/list-timer-configuration.action.ts` + `__tests__/`:
2.2.1 Failing test: "should return unauthenticated with no session, without constructing the backend adapter" → implement session-guard-first structure. **[spec: No session — guarded, never reaches backend]**
2.2.2 Failing test: "should return unknown when the adapter factory throws (e.g. missing BACKEND_URL)" → wrap adapter construction in try/catch.
2.2.3 Failing test: "should return ok:true with the list on success" → wire `listTimerConfigurations({ repository })()`. **[spec: Authenticated request succeeds]**
2.2.4 Failing test: "should never throw, resolving a Result in every branch" → regression-proof wrapper.

2.3 [P, depends on 2.1] `src/infraestructure/actions/delete-timer-configuration/delete-timer-configuration.action.ts` + `__tests__/`:
2.3.1 Failing test: "should reject malformed input without touching the repository" (zod boundary shape-check) → implement input validation first.
2.3.2 Failing test: "should return unauthenticated with no session, without constructing the backend adapter" → same guard pattern.
2.3.3 Failing test: "should return not-found when the target record is missing" → catch `timerConfigurationNotFound`. **[spec: Target record missing]**
2.3.4 Failing test: "should return ok:true with null on success" → wire `deleteTimerConfiguration`.

### 2b — Create + update actions (PR targets 2a's branch) [x] COMPLETE

2.4 [P, depends on 2.1] `src/infraestructure/actions/create-timer-configuration/create-timer-configuration.action.ts` + `__tests__/`:
2.4.1 Failing test: "should reject malformed input without touching the repository" → zod shape-check.
2.4.2 Failing test: "should return unauthenticated with no session" → guard.
2.4.3 Failing test: "should return invalid-configuration when rounds/roundDuration/restDuration is non-positive" → catch `InvalidTimerConfiguration`. **[spec: Domain validation failure surfaces as a result, not a throw]**
2.4.4 Failing test: "should return ok:true with the created configuration on success" → wire `createTimerConfiguration`.

2.5 [P, depends on 2.1] `src/infraestructure/actions/update-timer-configuration/update-timer-configuration.action.ts` + `__tests__/`:
2.5.1 Failing test: "should reject malformed input without touching the repository" → zod shape-check.
2.5.2 Failing test: "should return unauthenticated with no session" → guard.
2.5.3 Failing test: "should return invalid-configuration on non-positive values" → catch `InvalidTimerConfiguration`.
2.5.4 Failing test: "should return not-found when the target record is missing" → catch `timerConfigurationNotFound`.
2.5.5 Failing test: "should return ok:true with the updated configuration on success" → wire `updateTimerConfiguration`.

## Slice 3 — List screen [x] COMPLETE

**Depends on**: 1.6 (`formatDuration`), 2.2 (`list` action), 2.3 (`delete` action). **Enables**: 4 (`useTimerConfigurations` reused by the form hook).

3.1 [S, depends on 2.2, 2.3] `src/ui/hooks/use-timer-configurations.ts` + `__tests__/`:
3.1.1 Failing test: "should call the list action, never the injected adapter, when authenticated" → implement auth branch calling `listTimerConfigurationsAction`.
3.1.2 Failing test: "should call the use case over the injected adapter, never the action, when guest" → implement guest branch (D1: `createTimerConfiguration({ repository: localAdapter })(...)` pattern, applied to list too). **[design D1]**
3.1.3 Failing test: "should return a Result and never throw when the guest-path use case rejects" → wrap guest branch in try/catch mapping to `Result`.
3.1.4 Failing test: "should keep the returned operations object referentially stable across re-renders with the same isAuthenticated/localAdapter" → `useMemo([isAuthenticated, localAdapter])`.
(repeat the auth-vs-guest pair of assertions for `create`, `update`, `remove` as needed by the interface — each is a separate `should` test, not folded into one.)

3.2 [S, depends on 3.1, 1.6] `src/ui/components/timer-configuration-list/{timer-configuration-list.tsx, .hook.ts, .types.ts, index.ts}` + `__tests__/timer-configuration-list.hook.test.ts`:
3.2.1 Failing test: "should load configurations on mount" → implement initial `list()` call in the hook.
3.2.2 Failing test: "should expose the empty state when list resolves with []" → implement empty-state flag. **[spec: No configurations exist]**
3.2.3 Failing test: "should remove a row optimistically before the delete call resolves" → implement optimistic removal. **[spec: Delete without confirmation]**
3.2.4 Failing test: "should restore the row and set an error when delete fails" → implement rollback-on-failure branch.

3.3 [P, independent presentational] `src/ui/components/timer-configuration-card/{timer-configuration-card.tsx, .types.ts, index.ts}` — no hook, no test (presentational only). Renders name, level badge via `calculateTimerLevel`, rounds, `formatDuration`-formatted work/rest. **[spec: Configurations exist — card rendering fields]**

3.4 [S, depends on 3.2, 3.3] `src/app/timers/page.tsx` (`force-dynamic`, resolves `isAuthenticated` via `getCurrentSession`) + `__tests__/page.test.tsx`:
3.4.1 Failing test: "should pass isAuthenticated=true to the list component when a session exists" → implement composition root.
3.4.2 Failing test: "should pass isAuthenticated=false without redirecting when no session exists" → confirm no auth-gate redirect (guest access is intentional). **[spec: /timers reachable without authentication]**

3.5 [P, independent of 3.1-3.4] Modify `src/app/page.tsx` + `__tests__/page.test.tsx`:
3.5.1 Failing test: "should render a link to /timers" → add the link. **[spec: Navigation]**

## Slice 4 — Form screen (NOT split — single PR, accepted size:exception) [x] COMPLETE

**Depends on**: 1.5 (`get-timer-configuration`), 1.6 (`splitDuration`/`toTotalSeconds`), 1.7 (shadcn input/switch), 2.4/2.5 (create/update actions, from 2b), 3.1 (`useTimerConfigurations`), 1.4 (backend `getById`, for the edit page's server-side lookup).

4.1 [S, depends on 1.7] `src/ui/components/rounds-stepper/{rounds-stepper.tsx, .hook.ts, .types.ts, index.ts}` + `__tests__/rounds-stepper.hook.test.ts`:
4.1.1 Failing test: "should increment the value on increment()" → implement.
4.1.2 Failing test: "should decrement the value on decrement()" → implement.
4.1.3 Failing test: "should not decrement below 1" → implement floor clamp. **[design D7]**
4.1.4 Failing test: "should clamp a typed empty/NaN/0 value to 1" → implement manual-input clamp. **[design D7]**

4.2 [S, depends on 4.1, 1.5, 1.6, 3.1, 2.4, 2.5] `src/ui/components/timer-configuration-form/{timer-configuration-form.tsx, .hook.ts, .types.ts, index.ts}` + `__tests__/timer-configuration-form.hook.test.ts`:
4.2.1 Failing test: "should pre-fill split minutes/seconds when initialConfiguration is provided" → implement edit pre-fill via `splitDuration`. **[spec: Edit pre-fills via getById]**
4.2.2 Failing test: "should combine minutes and seconds into total seconds on submit" → implement `toTotalSeconds` composition on submit.
4.2.3 Failing test: "should block submit and set fieldErrors when a combined duration is <= 0" → implement inline validation, no dispatch. **[spec: Invalid input surfaces inline, no crash]**
4.2.4 Failing test: "should call router.push('/timers') on successful create or update" → implement navigation on `Result.ok`. **[spec: Successful create or update redirects]**
4.2.5 Failing test: "should map each failure code to its ERROR_CODE_COPY message in formError" → implement summary-error mapping.
4.2.6 Failing test: "should redirect a guest editing a missing id via router.replace('/timers')" → implement guest not-found branch using `getTimerConfiguration({ repository: localAdapter })`. **[spec: Edit target missing — guest identity]**

4.3 [P, depends on 4.2] `src/app/timers/new/page.tsx` + `__tests__/`:
4.3.1 Failing test: "should render the form with no initialConfiguration and the resolved isAuthenticated flag" → implement composition root passing `initialConfiguration: null`.

4.4 [S, depends on 4.2, 1.4, 1.5 — first dynamic route] `src/app/timers/[id]/edit/page.tsx` + `__tests__/`:
4.4.1 Failing test: "should await props.params and read id before use" → implement `const { id } = await props.params`.
4.4.2 Failing test: "should call notFound() when authenticated and getTimerConfiguration rejects with TimerConfigurationNotFound" → implement auth branch + catch. **[spec: Edit target missing — auth identity]**
4.4.3 Failing test: "should pass null initialConfiguration for a guest identity (no server-side lookup)" → implement guest branch (client-side resolution deferred to the form hook, per D3). **[design D3]**
4.4.4 Failing test: "should pass the fetched configuration as initialConfiguration when authenticated and found" → implement success path.

---

## PR sequence (confirmed, stacked-to-main)

1. Slice 1 (Foundations) → targets `main`
2. Slice 2a (Result + list + delete actions) → targets `main` (after slice 1 merges, or in parallel if reviewer allows)
3. Slice 2b (create + update actions) → targets slice 2a's branch
4. Slice 3 (List screen) → targets slice 2b's branch (or `main` once 2a+2b are merged)
5. Slice 4 (Form screen, single PR, size:exception) → targets slice 3's branch (or `main` once 3 is merged)

## Review Workload Forecast (resolved)

| Slice                       | Est. changed lines                | Budget risk | Decision                                        |
| --------------------------- | --------------------------------- | ----------- | ----------------------------------------------- |
| 1 — Foundations             | ~150 hand-written + ~200 vendored | Medium      | No split needed                                 |
| 2a — Result + list + delete | ~230                              | OK          | —                                               |
| 2b — Create + update        | ~220                              | OK          | —                                               |
| 3 — List screen             | ~350                              | Medium      | No split needed                                 |
| 4 — Form screen             | ~450                              | High        | **Accepted `size:exception`** — ships as one PR |

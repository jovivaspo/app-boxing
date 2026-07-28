# Tasks: Timer Activo engine (Issue #22)

Strict TDD: failing test first (RED), then minimal implementation (GREEN). `should` titles, AAA with blank lines, mocks only at port boundaries. Presentational `.tsx` never tested — only hooks. Follows design's file list/interfaces (D1-D15) verbatim.

## Review Workload Forecast

| Field                   | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| Estimated changed lines | Slice 1 ~250, Slice 2 ~400, Slice 3 ~120                |
| 400-line budget risk    | Slice 1 Low, Slice 2 Medium, Slice 3 Low                |
| Chained PRs recommended | Yes                                                     |
| Suggested split         | PR 1 (Engine+bell) → PR 2 (Screen) → PR 3 (Route+entry) |
| Delivery strategy       | ask-on-risk                                             |
| Chain strategy          | stacked-to-main (confirmed 2026-07-27)                  |

Decision resolved (2026-07-27): user confirmed chained PRs with `stacked-to-main` (PR 1 → PR 2 → PR 3, each targeting the previous branch, merging in sequence). Slice 2's ~400-line budget-edge risk is accepted as-is — proceed with the slice as designed; if it overruns during apply, re-evaluate then and consider splitting into "hook core" vs. "hook edge cases (visibility/guest)" at that point rather than pre-splitting now.

### Suggested Work Units

| Unit | Goal                                            | Likely PR | Notes                                                                           |
| ---- | ----------------------------------------------- | --------- | ------------------------------------------------------------------------------- |
| 1    | Engine + bell (domain + port + adapter + asset) | PR 1      | Base: main. Zero user-visible change, fully unit-testable.                      |
| 2    | Screen (presentational + hook)                  | PR 2      | Base: PR 1's branch (or main once merged). Compiles but unreachable until PR 3. |
| 3    | Route + card entry point                        | PR 3      | Base: PR 2's branch (or main once merged). Wires everything together.           |

## Slice 1 — Engine + bell

**Depends on**: nothing. **Enables**: Slice 2 (hook imports the domain + `BellPort`).

- [x] 1.1 Source `public/sounds/bell.mp3` under CC0/public domain (e.g. freesound.org CC0 filter) — blocks 1.5/1.6. No test.
- [x] 1.2 RED `src/domain/timer-session/__tests__/timer-session.model.test.ts` (node env, no mocks): start state (round 1/work/running); `remainingSeconds` counts down and clamps at 0; work→rest on expiry, rest→work increments round; final round's work → `finished`, no trailing rest **[spec: Round phase state machine, Final round]**; multi-phase gap in one call lands on correct round+phase, same reference when nothing expired **[design D4]**; pause freezes `remainingSeconds` across advancing `now`, resume continues from frozen value **[spec: Playback controls]**; `advanceTimerSession` inert while paused/finished; `elapsedFraction` 0→1, 1 when finished.
- [x] 1.3 GREEN `src/domain/timer-session/timer-session.model.ts`: `TimerSessionState`/`TimerSessionPlan` + `startTimerSession`, `remainingSeconds`, `phaseDurationSeconds`, `elapsedFraction`, `advanceTimerSession`, `pauseTimerSession`, `resumeTimerSession`, `stopTimerSession`, private `effectiveNow` **[design D2, D3, D4, D5]**.
- [x] 1.4 `src/application/ports/bell.port.ts`: `BellPort { ring(): void }` **[design D10]**. Plus `src/application/ports/__mocks__/bell-port.mock.ts`: `{ ring: vi.fn() }`. No dedicated test (interface-only).
- [x] 1.5 RED `src/infraestructure/audio/__tests__/bell.adapter.test.ts` (jsdom, depends on 1.1): constructs no `Audio` until first `ring()` (SSR safety); rewinds `currentTime` before replay; does not throw when `play()` rejects.
- [x] 1.6 GREEN `src/infraestructure/audio/bell.adapter.ts`: `createHtmlAudioBellAdapter(src = "/sounds/bell.mp3")`, lazy `audio ??= new Audio(src)`, `void audio.play().catch(() => {})` **[design D10]**.

## Slice 2 — Screen

**Depends on**: Slice 1 (domain + `BellPort`). **Enables**: Slice 3 (route composes the presentational component; card links to the route).

- [x] 2.1 `src/ui/components/timer-active/timer-active.types.ts`: `TimerActiveProps`, `TimerActiveStatus`, `TimerActiveDeps`, `UseTimerActiveResult` **[design interfaces]**. No test (types-only).
- [x] 2.2 RED `src/ui/components/timer-active/__tests__/timer-active.hook.test.ts` (jsdom, `vi.useFakeTimers()`, mocks `BellPort` + local adapter at port boundary): idle before `start()`; `start()` rings once iff `bellSound` **[spec: Phase-transition bell cue, START unlock D7]**; rings exactly once per transition across many ticks, never on a StrictMode double-invoke **[design D9]**; rings on `finished`; 10s warning fires once per phase, not again in-phase, and not at all when `warnBeforeEnd` is false **[spec: Phase-end warning cue]**; pause freezes `remainingLabel`, resume continues **[spec: Playback controls]**; `stop()` pushes `/timers` and persists nothing; a `visibilitychange` to `visible` after a long gap recomputes the correct round+phase with no drift **[spec: Tab backgrounded and refocused]** — this is the one required anti-drift proof, do not drop it; guest branch resolves via the injected local adapter, guest not-found redirects to `/timers`; interval cleared on unmount.
- [x] 2.3 GREEN `src/ui/components/timer-active/timer-active.hook.ts`: `useTimerActive(props, deps = DEFAULT_DEPS)` — `TICK_MS = 200`, `WARNING_SECONDS = 10`, `sessionRef` mirror, `warnedPhaseKeyRef`, `setInterval` + `visibilitychange` listener both torn down on cleanup, `start/pause/resume/stop` **[design D7, D8, D9, A1]**.
- [x] 2.4 `src/ui/components/timer-active/timer-active.tsx` (presentational, no logic) + `index.ts` barrel: header chips (D13), phase badge, ring (`pathLength=100`, D11/D12), countdown, round caption, `STOP`/`PAUSE`-`RESUME` controls, loading/idle/finished/error states per design's mock-fidelity table **[spec: Timer Activo screen layout, D15 Spanish copy]**. No test (presentational).

## Slice 3 — Route + entry

**Depends on**: Slice 1 + Slice 2. **Enables**: nothing further (final slice).

- [ ] 3.1 RED `src/app/timers/[id]/active/__tests__/page.test.tsx`: awaits `params` before use; authenticated + record exists → fetches server-side, passes `initialConfiguration` **[spec: Authenticated, record exists]**; authenticated + missing record → calls `notFound()` **[spec: Authenticated, record missing]**; rethrows non-not-found errors; guest identity → passes only `timerId`, no server-side fetch, no redirect **[spec: Guest identity]**.
- [ ] 3.2 GREEN `src/app/timers/[id]/active/page.tsx`: mirrors `[id]/edit/page.tsx` (`force-dynamic`, `getCurrentSession`, `getTimerConfiguration` + `notFound()` on `TimerConfigurationNotFound`), renders `TimerActive` with no `<h1>` (chrome-free).
- [ ] 3.3 Modify `src/ui/components/timer-configuration-card/timer-configuration-card.tsx`: add `Play` icon `Button asChild variant="ghost" size="icon"` wrapping `<Link href={/timers/${id}/active}>`, left of the existing Pencil action **[spec: Start a session, design D14]**. Card stays hook-free — no new test.

## Non-Goals (carried from spec, do not implement)

Session history/persistence, partial-session saving, stats, background/lock-screen execution, Web Workers, wake-lock, bottom navigation, new dependencies.

# Design: Timer Activo engine (issue #22)

## Technical Approach

A pure domain state machine (`src/domain/timer-session/`) owns work/rest progression and all
time math; it never reads a clock — every derived value takes `now: number` as a parameter, so
the whole engine is testable with fake timestamps and zero mocks. A single UI hook
(`timer-active.hook.ts`) owns everything browser-shaped: the re-render trigger, the
`visibilitychange`-forced recompute, the bell/warning cues, and the guest config lookup. The
presentational `.tsx` renders derived values only.

Remaining time is **always** recomputed as `duration - (now - phaseStartedAt)` against a fixed
origin — never an accumulated decrement. A missed or throttled tick therefore self-corrects on
the next recompute instead of compounding into drift. `advanceTimerSession` walks _as many_
expired phases as the elapsed gap covers, so a tab backgrounded for five minutes lands on the
correct round and phase, not just the next one.

No application use case: a running session touches no port, so a use case would be an empty
passthrough (confirmed deviation, see D1). Config _loading_ still goes through the existing
`getTimerConfiguration` use case, unchanged.

## Architecture Decisions

### D1 — No application use case for the session engine (confirmed deviation)

**Choice**: `timer-active.hook.ts` imports the domain state machine directly.
**Rejected**: an `application/use-cases/run-timer-session/` wrapper.
**Rationale**: the archived "every port call goes through a use case" precedent (D1/D4 of
timer-configuration-screens) exists to mediate a **repository port**. A running session has no
port — the use case would have nothing to orchestrate and would only forward arguments. Config
loading, which _does_ touch a port, still goes through `getTimerConfiguration`. Confirmed by the
user during the proposal question round.

### D2 — Session state is a value; the clock is a parameter

**Choice**: `TimerSessionState` stores `phaseStartedAt` (epoch ms) and `pausedAt | null`. Every
derived function (`remainingSeconds`, `elapsedFraction`, `advanceTimerSession`) takes `now: number`.
**Rejected**: storing a mutable `remaining` counter decremented per tick; storing a `Date` object.
**Rationale**: this IS the anti-drift requirement of the issue, expressed as a type. It also makes
the domain trivially testable (`remainingSeconds(state, 1_000_000)`) with no timers, no jsdom, no
mocks — matching the project's testing-strategy rule that domain tests need none of those.
Internally every derived function starts with `const at = state.pausedAt ?? now`, so "paused
freezes the countdown" falls out of one line instead of being special-cased in each function.

### D3 — Pause shifts the origin, it does not snapshot the remainder

**Choice**: `pause` sets `pausedAt = now`; `resume` sets `phaseStartedAt += now - pausedAt` and
clears `pausedAt`.
**Rejected**: storing `remainingAtPause` and restarting a fresh phase from it on resume.
**Rationale**: keeps exactly one time origin in the state. The rejected form introduces a second
source of truth that must agree with the first — the classic place drift creeps back in.

### D4 — `advanceTimerSession` walks all expired phases, and returns the same reference when nothing changed

**Choice**: a `while` loop advancing phase-by-phase while the current phase has expired; returns
`state` itself (identity) when no transition occurred.
**Rejected**: advancing at most one phase per call.
**Rationale**: a backgrounded tab may deliver no ticks for minutes. Single-step advancement would
require N ticks to catch up N phases, i.e. visible drift on refocus — the exact bug this change
exists to prevent. Reference identity lets the hook `setState(next)` with React's bail-out and
lets cue firing be a plain `next !== prev` comparison.
**Known ceiling**: the loop runs at most `2 * rounds` iterations. `rounds` has no upper bound in
`validateTimerConfiguration`, so a pathological 100k-round config would spin 200k cheap object
spreads once. Not guarded — revisit only if a rounds maximum is ever introduced.

### D5 — The session ends after the last WORK phase (no trailing rest)

**Choice**: `work(rounds) → finished`. Total phases = `2 * rounds - 1`.
**Rejected**: `work(rounds) → rest → finished`.
**Rationale**: a boxing session ends when the last round ends. A trailing rest with nothing after
it is dead time the user has to sit through before seeing "finished".

### D6 — No `idle` status in the domain; idle is "no session yet" in the hook

**Choice**: domain `TimerStatus = "running" | "paused" | "finished"`. The screen shows an idle
pre-start state simply because `session === null` until `start()` is pressed.
**Rejected**: a fourth `idle` domain status.
**Rationale**: an idle session has no `phaseStartedAt` — modelling it in the domain would force a
nullable origin into every derived function for a state the domain has no rules about. The hook
already needs a `loading`/`error` presentation status for the guest lookup, so idle joins that
presentation-only union.

### D7 — The screen requires an explicit START tap (and that tap is the audio unlock)

**Choice**: navigating to `/timers/[id]/active` does **not** auto-start. The screen renders the
mock layout in a pre-start state (full ring, countdown showing the round duration, button row =
`STOP` + `INICIAR`). The START press calls `bell.ring()` first, then `startTimerSession`.
**Rejected**: auto-start on mount with a best-effort `.play()` on the first transition.
**Rationale**: two problems solved by one tap. (a) Browser autoplay policy blocks a
non-gesture-adjacent `.play()`; the first bell fires minutes after mount, far from any gesture.
Playing the element once inside the START handler unlocks that element for every later
programmatic play. (b) A round timer that starts counting the instant the page loads is hostile —
you need the seconds between "open the screen" and "get to the bag".
There is no separate `unlock()` method: ringing the bell to **start** round 1 is authentic boxing
behavior, so the unlock and the feature are the same call.
**Judgment call** — the mock only captures the running frame; the pre-start frame is extrapolated.
Flagged for confirmation.

### D8 — `setInterval(200ms)` as the render trigger, not `requestAnimationFrame`

**Choice**: a 200 ms interval plus a `visibilitychange` listener; the ring smooths the gap with a
CSS `transition-[stroke-dashoffset] duration-200 ease-linear`.
**Rejected**: rAF (the exploration's tentative preference).
**Rationale**: rAF fires ~60×/s and every fire would be a React re-render — 60 renders/s to move a
display that changes once per second. The visual argument for rAF (a smooth ring) is fully covered
by a 200 ms linear CSS transition at 1/12 the render cost. Both options are equally exposed to
background throttling, so `visibilitychange` is mandatory either way and rAF buys nothing there.
Background-tab interval clamping (≥1 s) is harmless: the math is recompute-based (D2) and refocus
forces an immediate recompute.

### D9 — Cues fire from the tick callback, never from a state updater or a render effect

**Choice**: `advance(now)` reads the current state from a ref, computes `next`, fires the bell when
`next !== prev`, fires the warning when the phase key first crosses 10 s, then commits state.
**Rejected**: firing cues inside the `setState` updater; firing them in a `useEffect` keyed on
`[round, phase]`.
**Rationale**: state updaters must be pure — React StrictMode double-invokes them, which would
double-ring the bell. A `useEffect` would fire once on mount for the initial phase (a bell nobody
asked for) and is double-invoked in StrictMode dev too. Comparing prev/next in the tick callback
makes "exactly once per phase" structural rather than a dedupe patch.
The 10 s warning additionally needs an explicit ref (`warnedPhaseKeyRef`) because it is a
threshold crossing, not a transition: `phaseKey = ${round}-${phase}`, set on first fire, compared
before firing.

### D10 — Bell behind an `application/ports/bell.port.ts`, adapter creates the element lazily

**Choice**: `BellPort { ring(): void }`; `createHtmlAudioBellAdapter(src?)` in
`src/infraestructure/audio/`, exposed to the hook as an overridable dep with a module-level
default (A1 pattern, precedent `createGsiLoaderAdapter()` + `GoogleIdentityPort`).
**Rejected**: Web Audio API (`AudioContext` suspension handling for one sound effect);
`new Audio()` inline in the hook.
**Rationale**: the port lives in `application/` because UI→application is legal and UI→infra is
not (outside the three sanctioned exceptions) — same placement as `GoogleIdentityPort`. The
`HTMLAudioElement` is constructed lazily **inside** `ring()`, not in the factory: this component
is a client component but Next.js still renders it on the server, and a module-level `new Audio()`
would throw during SSR.
**Ring never throws**: `void audio.play().catch(() => {})`. A blocked or missing sound must not
break the countdown.

### D11 — Ring shows CURRENT PHASE progress, not whole-session progress

**Choice**: `elapsedFraction` of the active phase drives `stroke-dashoffset`; the ring depletes as
the phase runs down.
**Rejected**: session-wide progress across all rounds.
**Rationale**: the ring encircles the phase countdown — one visual, one meaning. Session progress
is already communicated, verbatim, by `ROUND 4 / 12` inside the same ring. Depletion (rather than
fill) matches the countdown it surrounds.

### D12 — REST phase reuses the existing amber accent token (judgment call, needs confirmation)

**Choice**: WORK → `bg-primary` badge (`#dc0000`) + `stroke-primary` ring, exactly as the mock.
REST → `bg-accent` badge + `text-accent-foreground` + `stroke-accent` ring, using the amber
`--accent: #f9bd22` / `--accent-foreground: #402d00` already defined in `globals.css`. Layout,
typography, and spacing are byte-identical between phases — only the accent and the badge label
change.
**Rejected**: a muted/gray rest treatment (reads as disabled, not as an active recovery phase);
inventing a new color token (the proposal forbids new palette work).
**Rationale**: the mock only captured a WORK frame, so this is extrapolated. Amber is the only
non-red accent already in the palette and carries a natural "hold / recover" reading against the
red work phase. **Flagged for user confirmation** — this is the one visual element with no ground
truth in the screenshot.

### D13 — The two header chips are configuration indicators, rendered conditionally

**Choice**: the bell chip renders only when `configuration.bellSound`; the `10S` chip renders only
when `configuration.warnBeforeEnd`. When the warning is active the `10S` chip inverts to
`bg-primary text-primary-foreground`.
**Rejected**: always rendering both chips as static decoration.
**Rationale**: the mock's chips map one-to-one onto the two boolean fields of `TimerConfiguration`.
Reading them as live indicators of what the running session will do makes them informative instead
of ornamental, at zero extra cost. The invert-on-warning also satisfies the accessibility rule that
state must not be conveyed by color alone — the countdown's color change is backed by a chip that
visibly changes and an `aria-live` announcement.

### D14 — The card's start action is a `<Link>`, so the card stays hook-free

**Choice**: a `Play` icon button (`Button asChild variant="ghost" size="icon"`) wrapping
`<Link href={/timers/${config.id}/active}>`, placed left of the existing Pencil in the action row.
**Rejected**: `useRouter().push()` in a new `timer-configuration-card.hook.ts`.
**Rationale**: Hard Rule A2 forbids logic in the presentational `.tsx` — a declarative `<Link>` is
markup, not logic, which is exactly why the existing Edit action is already a `<Link>` in that same
file with no hook. Adding a hook here would create the project's first hook that exists only to
call `router.push` on click, plus a test file for it. The card remains "presentational, no hook, no
test" as recorded in the archived design.

### D15 — Screen copy is Spanish; layout is the mock

**Choice**: `TRABAJO` / `DESCANSO`, `PARAR` / `PAUSA` / `REANUDAR` / `INICIAR`, `PROGRESO ACTUAL`,
`ROUND 4` `/ 12`.
**Rejected**: the mock's literal English strings (`WORK`, `STOP`, `PAUSE`).
**Rationale**: every existing screen is Spanish (`Mis Timers`, `Editar Timer`, `Trabajo`,
`Descanso`, `Nuevo Timer`). The proposal's visual constraint is layout, components, and hierarchy —
shipping the app's only English screen would be a _worse_ match to the product than translating the
labels. `ROUND` is kept untranslated because the existing card already uses `Rounds` inside Spanish
copy.

## Data Flow

```
   app/timers/[id]/active/page.tsx  (Server Component, force-dynamic)
     └─ getCurrentSession(createCookieSessionAdapter())
        ├─ auth  → getTimerConfiguration({ repository: backendAdapter })(id)
        │           └─ notFound() on "not-found"      → initialConfiguration
        └─ guest → initialConfiguration = null, timerId = id
                                    │  serializable props
                                    v
                        timer-active.tsx  (presentational only)
                                    └─ useTimerActive(props, deps)
                                         ├─ guest branch: getTimerConfiguration({ repository: localAdapter })(timerId)
                                         ├─ domain: start / advance / pause / resume  (pure, now injected)
                                         ├─ trigger: setInterval(200) + visibilitychange → advance(Date.now())
                                         ├─ cues:   bell.ring() on transition | finish | start   (D9)
                                         └─ stop(): router.push("/timers")
```

The presentational component receives only strings, numbers, booleans and callbacks — it never
sees `TimerSessionState`.

## File Changes

| File                                                                      | Action | Purpose                                                              |
| ------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `src/domain/timer-session/timer-session.model.ts`                         | New    | state shape + all transitions and time math, pure                    |
| `src/domain/timer-session/__tests__/timer-session.model.test.ts`          | New    | domain unit tests, fake timestamps, zero mocks, node env             |
| `src/application/ports/bell.port.ts`                                      | New    | `BellPort { ring(): void }`                                          |
| `src/application/ports/__mocks__/bell-port.mock.ts`                       | New    | `{ ring: vi.fn() }` (mirrors the existing port-mock convention)      |
| `src/infraestructure/audio/bell.adapter.ts`                               | New    | `createHtmlAudioBellAdapter(src?)`, lazy `new Audio`, never throws   |
| `src/infraestructure/audio/__tests__/bell.adapter.test.ts`                | New    | jsdom; plays, rewinds, swallows a rejected `play()`                  |
| `src/ui/components/timer-active/timer-active.tsx`                         | New    | presentational screen (ring, badge, countdown, chips, buttons)       |
| `src/ui/components/timer-active/timer-active.hook.ts`                     | New    | all logic (A2): loop, visibility, cues, guest lookup, navigation     |
| `src/ui/components/timer-active/timer-active.types.ts`                    | New    | props + hook result types                                            |
| `src/ui/components/timer-active/index.ts`                                 | New    | barrel                                                               |
| `src/ui/components/timer-active/__tests__/timer-active.hook.test.ts`      | New    | jsdom + fake timers; hook only (presentational is never tested)      |
| `src/app/timers/[id]/active/page.tsx`                                     | New    | composition root, mirrors `[id]/edit/page.tsx`                       |
| `src/app/timers/[id]/active/__tests__/page.test.tsx`                      | New    | auth seeds config, `notFound()` on not-found, guest passes `timerId` |
| `src/ui/components/timer-configuration-card/timer-configuration-card.tsx` | Modify | add the `Play` → `/timers/[id]/active` link (D14)                    |
| `public/sounds/bell.mp3`                                                  | New    | CC0/public-domain bell asset, sourced before apply                   |

No existing domain / application / infrastructure timer-configuration code is touched.

## Interfaces / Contracts

```ts
// src/domain/timer-session/timer-session.model.ts — pure, no imports beyond types
export type TimerPhase = "work" | "rest";
export type TimerStatus = "running" | "paused" | "finished";

export interface TimerSessionPlan {
  rounds: number;
  roundDuration: number; // seconds
  restDuration: number; // seconds
}

export interface TimerSessionState {
  readonly plan: TimerSessionPlan;
  readonly round: number; // 1-based
  readonly phase: TimerPhase;
  readonly status: TimerStatus;
  readonly phaseStartedAt: number; // epoch ms — the single time origin (D2)
  readonly pausedAt: number | null; // epoch ms while paused, else null (D3)
}

export function startTimerSession(
  plan: TimerSessionPlan,
  now: number
): TimerSessionState;
export function phaseDurationSeconds(state: TimerSessionState): number;
export function remainingSeconds(state: TimerSessionState, now: number): number; // ceil, clamped >= 0
export function elapsedFraction(state: TimerSessionState, now: number): number; // 0..1, 1 when finished
export function advanceTimerSession(
  state: TimerSessionState,
  now: number
): TimerSessionState; // D4
export function pauseTimerSession(
  state: TimerSessionState,
  now: number
): TimerSessionState;
export function resumeTimerSession(
  state: TimerSessionState,
  now: number
): TimerSessionState;
export function stopTimerSession(state: TimerSessionState): TimerSessionState; // -> finished
```

Internal to the module (not exported): `effectiveNow(state, now) = state.pausedAt ?? now`, applied
first in every derived function — this is what makes pause freeze the countdown everywhere at once
(D3). `advanceTimerSession` is a no-op returning the same reference when `status !== "running"` or
when no phase boundary has been crossed (D4).

```ts
// src/application/ports/bell.port.ts
export interface BellPort {
  /** Best-effort playback. MUST NOT throw and MUST NOT reject (D10). */
  ring(): void;
}
```

```ts
// src/infraestructure/audio/bell.adapter.ts
export function createHtmlAudioBellAdapter(src = "/sounds/bell.mp3"): BellPort;
// closure-scoped `let audio: HTMLAudioElement | null = null`
// ring(): audio ??= new Audio(src)  ← lazy: SSR-safe, factory touches no DOM
//         audio.currentTime = 0; void audio.play().catch(() => {});
```

```ts
// src/ui/components/timer-active/timer-active.types.ts
export interface TimerActiveProps {
  isAuthenticated: boolean;
  initialConfiguration: TimerConfiguration | null;
  timerId?: string; // guest branch only (D3 of the archived design)
}

export type TimerActiveStatus =
  | "loading" // guest lookup in flight
  | "idle" // config resolved, not started yet (D6/D7)
  | "running"
  | "paused"
  | "finished"
  | "error";

export interface TimerActiveDeps {
  bell?: BellPort;
  localAdapter?: TimerConfigurationRepositoryPort;
}

export interface UseTimerActiveResult {
  status: TimerActiveStatus;
  name: string; // configuration name, "" while loading
  phase: TimerPhase; // "work" while idle
  round: number; // 1 while idle
  totalRounds: number;
  remainingLabel: string; // formatDuration(remainingSeconds) -> "m:ss"
  elapsedFraction: number; // 0..1, drives stroke-dashoffset (D11)
  isWarning: boolean; // warnBeforeEnd && running && remaining <= 10
  showBellChip: boolean; // configuration.bellSound (D13)
  showWarnChip: boolean; // configuration.warnBeforeEnd (D13)
  error: string | null;
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void; // -> router.push("/timers")
}
```

```ts
// src/ui/components/timer-active/timer-active.hook.ts  ("use client")
// A1: module-level defaults — both are browser-only and non-serializable, so they cannot be
// injected from an app/ Server Component; they are exposed as an overridable dep so tests
// substitute fakes at the port boundary.
const DEFAULT_DEPS: Required<TimerActiveDeps> = {
  bell: createHtmlAudioBellAdapter(),
  localAdapter: createLocalTimerConfigurationAdapter(),
};

export function useTimerActive(
  props: TimerActiveProps,
  deps: TimerActiveDeps = DEFAULT_DEPS // stable module-level identity — safe in effect deps
): UseTimerActiveResult;
```

**Hook internals (the load-bearing parts):**

```ts
const TICK_MS = 200; // D8
const WARNING_SECONDS = 10;

const sessionRef = useRef<TimerSessionState | null>(null); // mirror: cues read state outside render (D9)
const warnedPhaseKeyRef = useRef<string | null>(null);
const [session, setSession] = useState<TimerSessionState | null>(null);
const [now, setNow] = useState(() => Date.now());

const advance = useCallback(
  (at: number) => {
    const prev = sessionRef.current;
    if (!prev || prev.status !== "running") return;

    const next = advanceTimerSession(prev, at);
    if (next !== prev) {
      if (config.bellSound) bell.ring(); // transition bell AND final bell (D9)
      sessionRef.current = next;
      setSession(next);
    }
    if (
      config.warnBeforeEnd &&
      next.status === "running" &&
      remainingSeconds(next, at) <= WARNING_SECONDS
    ) {
      const key = `${next.round}-${next.phase}`;
      if (warnedPhaseKeyRef.current !== key) {
        warnedPhaseKeyRef.current = key;
        /* warning cue */
      }
    }
    setNow(at);
  },
  [config, bell]
);

useEffect(() => {
  if (session?.status !== "running") return;
  const id = window.setInterval(() => advance(Date.now()), TICK_MS);
  const onVisibility = () => {
    if (document.visibilityState === "visible") advance(Date.now()); // mandatory, not optional
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}, [session?.status, advance]);
```

`start()` rings first, then creates the session — one call that is both the authentic round-1 bell
and the autoplay unlock (D7). `pause()`/`resume()` delegate to the domain and never ring. `stop()`
calls `stopTimerSession` then `router.push("/timers")`.

## Screen Layout (mock fidelity)

Reference: the "Timer Activo - Iron Pulse" screenshot. Structure, top to bottom, all centered in a
`flex min-h-screen flex-col items-center justify-between p-4` main on `bg-background`:

| Mock element               | Implementation                                                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header chip row            | `flex gap-2`; each chip `border-border bg-card border px-3 py-1 font-mono text-[10px] tracking-widest uppercase` + a `size-3` lucide icon (`Bell`, `TriangleAlert`). Conditional per D13; the warn chip inverts to `bg-primary text-primary-foreground` while `isWarning`.                        |
| Circular progress ring     | `<svg viewBox="0 0 100 100">` with two `<circle cx=50 cy=50 r=45 fill=none strokeWidth=6>`: a track (`stroke-border`) and a progress arc (`stroke-primary` / `stroke-accent` per D12), `-rotate-90` on the svg so it starts at 12 o'clock.                                                        |
| Ring progress math         | `pathLength={100} strokeDasharray="100" strokeDashoffset={elapsedFraction * 100}` — `pathLength` normalizes the circle to 100 units, so no `2πr` constant and no magic numbers. `strokeLinecap="round"`, `transition-[stroke-dashoffset] duration-200 ease-linear motion-reduce:transition-none`. |
| Phase badge                | `bg-primary text-primary-foreground px-2 py-1 font-mono text-[10px] tracking-widest uppercase` — the exact class string already used by the card's level badge. Text `TRABAJO` / `DESCANSO` (D15).                                                                                                |
| Countdown                  | `font-heading text-7xl tabular-nums` in `text-foreground`; `text-primary motion-safe:animate-pulse` while `isWarning`. Value = `formatDuration(remainingSeconds)` → `m:ss`, reusing `src/lib/duration.ts` unchanged (no `mm:ss` variant added).                                                   |
| `CURRENT PROGRESS` caption | `text-muted-foreground font-mono text-[10px] tracking-widest uppercase` → `PROGRESO ACTUAL`.                                                                                                                                                                                                      |
| `ROUND 4` / `/ 12`         | `font-heading text-xl uppercase` and `text-muted-foreground font-mono text-xs` on the line below.                                                                                                                                                                                                 |
| Button row                 | `grid w-full max-w-md grid-cols-2 gap-3`; both `h-20 flex-col gap-1 font-mono text-xs tracking-widest uppercase` shadcn `Button`s. Left: `variant="secondary"` + `Square` icon → `PARAR`. Right: `bg-primary` + `Pause`/`Play` icon → `PAUSA` / `REANUDAR` / `INICIAR`.                           |

Ring cluster: the badge, countdown, caption and round counter are absolutely centered inside the
ring via a `relative` wrapper (`size-72`) with the svg at `absolute inset-0` and the text stack in a
centered `flex flex-col items-center`.

**States beyond the mock frame:**

- `loading` (guest lookup): the same skeleton geometry with the countdown replaced by an
  `animate-pulse` block; `aria-busy="true"`.
- `idle` (D7): full ring, countdown showing `formatDuration(roundDuration)`, right button = `INICIAR`.
- `finished`: badge → `bg-muted text-muted-foreground` reading `COMPLETADO`, ring at full, countdown
  `0:00`, button row collapses to a single full-width `VOLVER A MIS TIMERS` link to `/timers`
  (no auto-redirect, per the proposal's decision log).
- `error` (guest id not found): `router.replace("/timers")`, matching the form hook's behavior.

**Accessibility:**

- The countdown numerals are `aria-hidden` and the ring is `role="presentation"`; a single
  `role="status" aria-live="polite"` visually-hidden region announces phase changes only
  (`"Round 4 de 12, trabajo"`) — a live region on per-second digits would flood a screen reader.
- All four controls are real `<button>`/`<a>` elements, keyboard-reachable, with the project's
  existing focus-ring token (`outline-ring/50` from `globals.css` `@layer base`).
- `isWarning` is never signalled by color alone — the chip inverts, the digits pulse, and the live
  region announces the phase; color is the third channel, not the only one.
- All motion is behind `motion-safe:` / `motion-reduce:` variants.

## Route

`src/app/timers/[id]/active/page.tsx` mirrors `[id]/edit/page.tsx` line for line: the same
`export const dynamic = "force-dynamic"` with the same comment, the same
`params: Promise<{ id: string }>` shape awaited at the top (Next.js 16), the same
`getCurrentSession(createCookieSessionAdapter())` resolution, the same guest early-return passing
`initialConfiguration={null}` + `timerId={id}`, and the same auth `try/catch` around
`getTimerConfiguration` mapping `toTimerConfigurationErrorCode(error) === "not-found"` to
`notFound()` and rethrowing anything else. Only the rendered component and the absence of an `<h1>`
differ — the active screen is chrome-free by design (the mock has no page title).

## Testing Strategy

Strict TDD: failing test first, one behavior per test, titles start with `should`, AAA with blank
lines, mocks at port boundaries only. Presentational `.tsx` is NOT tested.

| Test file                                                                           | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `domain/timer-session/__tests__/*.test.ts` (node env, **no mocks, no timers**)      | starts at round 1 / work / running; `remainingSeconds` counts down against an injected `now` and clamps at 0; work→rest on expiry; rest→work increments the round; last work phase → `finished` with no trailing rest (D5); a single call spanning several phase durations lands on the correct round+phase (D4); returns the identical reference when nothing expired; pause freezes `remainingSeconds` across advancing `now` (D3); resume continues from the frozen value, not from a restarted phase; `advanceTimerSession` is inert while paused/finished; `elapsedFraction` is 0 at phase start, 1 at expiry, 1 when finished                                                                          |
| `infraestructure/audio/__tests__/bell.adapter.test.ts` (jsdom)                      | constructs no `Audio` until the first `ring()` (SSR safety); rewinds `currentTime` before replay; does not throw when `play()` rejects                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ui/components/timer-active/__tests__/*.hook.test.ts` (jsdom, `vi.useFakeTimers()`) | starts idle and does not count down before `start()`; `start()` rings once when `bellSound`; never rings when `bellSound` is false; rings exactly once per phase transition across many ticks (D9); rings on `finished`; fires the 10 s warning once per phase and not again on subsequent ticks in the same phase; no warning when `warnBeforeEnd` is false; pause freezes `remainingLabel` while time advances; resume continues; `stop()` pushes `/timers`; a `visibilitychange` to `visible` after a long timer-less gap recomputes to the correct round+phase; guest branch resolves the config through the injected adapter; guest not-found replaces to `/timers`; the interval is cleared on unmount |
| `app/timers/[id]/active/__tests__/page.test.tsx`                                    | awaits `params`; seeds `initialConfiguration` for auth; calls `notFound()` on `TimerConfigurationNotFound`; rethrows other errors; passes `timerId` and `null` config for guests without redirecting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

**Testability lever**: `vi.useFakeTimers()` in Vitest patches `Date.now()` as well as
`setInterval`, so `vi.advanceTimersByTime(n)` moves the trigger and the clock together — the hook
needs no injected clock. The `visibilitychange` test instead sets the system time forward with
`vi.setSystemTime()` _without_ advancing timers (simulating a throttled background tab), then
redefines `document.visibilityState` and dispatches the event; this is the only test that proves
the anti-drift requirement end to end and it must not be dropped.

## Migration / Rollout

No data migration. Purely additive except the `Play` link on the card. Rollback = revert the
branch, or delete `src/domain/timer-session/`, `src/ui/components/timer-active/`,
`src/infraestructure/audio/`, `src/application/ports/bell.port.ts`,
`src/app/timers/[id]/active/`, `public/sounds/bell.mp3`, and the card's `Play` button.

## PR Slicing (chained, each slice depends only on earlier ones)

| #   | Slice         | Contents                                                                                                              | Budget |
| --- | ------------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Engine + bell | `domain/timer-session/` + tests; `application/ports/bell.port.ts` + port mock; `infraestructure/audio/` + test; asset | ~250   |
| 2   | Screen        | `ui/components/timer-active/` — `.tsx`, `.hook.ts`, `.types.ts`, `index.ts`, hook tests                               | ~400   |
| 3   | Route + entry | `app/timers/[id]/active/page.tsx` + test; the card's `Play` link                                                      | ~120   |

Slice 1 ships zero user-visible change and is fully testable in isolation. Slice 2 compiles and is
unit-tested but is unreachable until slice 3 adds the route and the entry point — deliberate, so
the largest slice arrives without route/navigation review noise mixed in.

## Open Questions

1. ~~**D12 (REST accent)**~~ — **Resolved (2026-07-27):** user confirmed the existing amber
   `--accent` token for the REST phase (badge + ring), over a neutral gray.
2. ~~**D7 (explicit START tap)**~~ — **Resolved (2026-07-27):** user confirmed the explicit
   START tap, accepted as both the autoplay-unlock fix and a deliberate addition to the
   captured mock frame.
3. **Bell asset** — still needs sourcing under CC0/public domain before slice 1 can land.

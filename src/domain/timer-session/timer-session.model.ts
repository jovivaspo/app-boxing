export type TimerPhase = "work" | "rest";
export type TimerStatus = "running" | "paused" | "finished";

export interface TimerSessionPlan {
  rounds: number;
  roundDuration: number;
  restDuration: number;
}

export interface TimerSessionState {
  readonly plan: TimerSessionPlan;
  readonly round: number;
  readonly phase: TimerPhase;
  readonly status: TimerStatus;
  readonly phaseStartedAt: number;
  readonly pausedAt: number | null;
}

function effectiveNow(state: TimerSessionState, now: number): number {
  return state.pausedAt ?? now;
}

export function startTimerSession(
  plan: TimerSessionPlan,
  now: number
): TimerSessionState {
  return {
    plan,
    round: 1,
    phase: "work",
    status: "running",
    phaseStartedAt: now,
    pausedAt: null,
  };
}

export function phaseDurationSeconds(state: TimerSessionState): number {
  return state.phase === "work"
    ? state.plan.roundDuration
    : state.plan.restDuration;
}

export function remainingSeconds(
  state: TimerSessionState,
  now: number
): number {
  if (state.status === "finished") return 0;

  const at = effectiveNow(state, now);
  const elapsedSeconds = (at - state.phaseStartedAt) / 1000;
  return Math.max(0, Math.ceil(phaseDurationSeconds(state) - elapsedSeconds));
}

export function elapsedFraction(state: TimerSessionState, now: number): number {
  if (state.status === "finished") return 1;

  const duration = phaseDurationSeconds(state);
  if (duration <= 0) return 1;

  const at = effectiveNow(state, now);
  const elapsedSeconds = (at - state.phaseStartedAt) / 1000;
  return Math.min(1, Math.max(0, elapsedSeconds / duration));
}

export function advanceTimerSession(
  state: TimerSessionState,
  now: number
): TimerSessionState {
  if (state.status !== "running") return state;

  let current = state;
  const at = effectiveNow(current, now);

  for (;;) {
    const durationMs = phaseDurationSeconds(current) * 1000;
    const elapsedMs = at - current.phaseStartedAt;
    if (elapsedMs < durationMs) break;

    const overshootMs = elapsedMs - durationMs;
    const nextPhaseStartedAt = at - overshootMs;

    if (current.phase === "work" && current.round >= current.plan.rounds) {
      current = {
        ...current,
        status: "finished",
        phaseStartedAt: nextPhaseStartedAt,
      };
      break;
    }

    current =
      current.phase === "work"
        ? { ...current, phase: "rest", phaseStartedAt: nextPhaseStartedAt }
        : {
            ...current,
            phase: "work",
            round: current.round + 1,
            phaseStartedAt: nextPhaseStartedAt,
          };
  }

  return current;
}

export function pauseTimerSession(
  state: TimerSessionState,
  now: number
): TimerSessionState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused", pausedAt: now };
}

export function resumeTimerSession(
  state: TimerSessionState,
  now: number
): TimerSessionState {
  if (state.status !== "paused" || state.pausedAt === null) return state;

  const pausedDuration = now - state.pausedAt;
  return {
    ...state,
    status: "running",
    phaseStartedAt: state.phaseStartedAt + pausedDuration,
    pausedAt: null,
  };
}

export function stopTimerSession(state: TimerSessionState): TimerSessionState {
  return { ...state, status: "finished" };
}

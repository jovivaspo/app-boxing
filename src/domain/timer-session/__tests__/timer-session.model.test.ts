import { describe, expect, it } from "vitest";

import {
  advanceTimerSession,
  elapsedFraction,
  pauseTimerSession,
  remainingSeconds,
  resumeTimerSession,
  startTimerSession,
  stopTimerSession,
  type TimerSessionPlan,
} from "../timer-session.model";

const PLAN: TimerSessionPlan = {
  rounds: 3,
  roundDuration: 180,
  restDuration: 60,
};

describe("startTimerSession", () => {
  it("should start at round 1, work phase, running status", () => {
    const now = 1_000;

    const state = startTimerSession(PLAN, now);

    expect(state.round).toBe(1);
    expect(state.phase).toBe("work");
    expect(state.status).toBe("running");
    expect(state.phaseStartedAt).toBe(now);
    expect(state.pausedAt).toBeNull();
  });
});

describe("remainingSeconds", () => {
  it("should count down as now advances", () => {
    const now = 0;
    const state = startTimerSession(PLAN, now);

    const remaining = remainingSeconds(state, now + 30_000);

    expect(remaining).toBe(150);
  });

  it("should clamp at 0 once the phase duration has fully elapsed", () => {
    const now = 0;
    const state = startTimerSession(PLAN, now);

    const remaining = remainingSeconds(state, now + 500_000);

    expect(remaining).toBe(0);
  });

  it("should still read 1 second remaining just before the phase boundary", () => {
    const now = 0;
    const state = startTimerSession(PLAN, now);

    const remaining = remainingSeconds(state, now + 179_900);

    expect(remaining).toBe(1);
  });
});

describe("advanceTimerSession", () => {
  it("should transition work to rest when the work phase expires", () => {
    const now = 0;
    const state = startTimerSession(PLAN, now);

    const next = advanceTimerSession(state, now + PLAN.roundDuration * 1000);

    expect(next.phase).toBe("rest");
    expect(next.round).toBe(1);
    expect(next.status).toBe("running");
  });

  it("should transition rest to work and increment the round", () => {
    const now = 0;
    const afterWork = advanceTimerSession(
      startTimerSession(PLAN, now),
      now + PLAN.roundDuration * 1000
    );

    const next = advanceTimerSession(
      afterWork,
      now + PLAN.roundDuration * 1000 + PLAN.restDuration * 1000
    );

    expect(next.phase).toBe("work");
    expect(next.round).toBe(2);
  });

  it("should finish on the final round's work phase with no trailing rest", () => {
    const plan: TimerSessionPlan = {
      rounds: 1,
      roundDuration: 180,
      restDuration: 60,
    };
    const now = 0;
    const state = startTimerSession(plan, now);

    const next = advanceTimerSession(state, now + plan.roundDuration * 1000);

    expect(next.status).toBe("finished");
  });

  it("should walk every expired phase in a single call spanning several phase durations", () => {
    const plan: TimerSessionPlan = {
      rounds: 3,
      roundDuration: 10,
      restDuration: 5,
    };
    const now = 0;
    const state = startTimerSession(plan, now);
    // work1(0-10s) -> rest1(10-15s) -> work2(15-25s) -> rest2(25-30s): 27s lands 2s into rest2.
    const at = now + 27_000;

    const next = advanceTimerSession(state, at);

    expect(next.round).toBe(2);
    expect(next.phase).toBe("rest");
  });

  it("should return the same reference when nothing has expired", () => {
    const now = 0;
    const state = startTimerSession(PLAN, now);

    const next = advanceTimerSession(state, now + 1_000);

    expect(next).toBe(state);
  });

  it("should be inert while paused", () => {
    const now = 0;
    const paused = pauseTimerSession(startTimerSession(PLAN, now), now + 1_000);

    const next = advanceTimerSession(paused, now + 500_000);

    expect(next).toBe(paused);
  });

  it("should be inert once finished", () => {
    const plan: TimerSessionPlan = {
      rounds: 1,
      roundDuration: 180,
      restDuration: 60,
    };
    const now = 0;
    const finished = advanceTimerSession(
      startTimerSession(plan, now),
      now + plan.roundDuration * 1000
    );

    const next = advanceTimerSession(finished, now + 999_000);

    expect(next).toBe(finished);
  });
});

describe("pauseTimerSession / resumeTimerSession", () => {
  it("should freeze remainingSeconds across an advancing now while paused", () => {
    const now = 0;
    const running = startTimerSession(PLAN, now);
    const paused = pauseTimerSession(running, now + 30_000);
    const remainingAtPause = remainingSeconds(paused, now + 30_000);

    const remainingMuchLater = remainingSeconds(paused, now + 300_000);

    expect(remainingMuchLater).toBe(remainingAtPause);
  });

  it("should resume from the frozen value rather than the original duration", () => {
    const now = 0;
    const running = startTimerSession(PLAN, now);
    const paused = pauseTimerSession(running, now + 30_000);
    const remainingAtPause = remainingSeconds(paused, now + 30_000);

    const resumed = resumeTimerSession(paused, now + 300_000);

    expect(remainingSeconds(resumed, now + 300_000)).toBe(remainingAtPause);
  });
});

describe("elapsedFraction", () => {
  it("should be 0 at the start of a phase", () => {
    const now = 0;
    const state = startTimerSession(PLAN, now);

    expect(elapsedFraction(state, now)).toBe(0);
  });

  it("should reach 1 once the phase duration has fully elapsed", () => {
    const now = 0;
    const state = startTimerSession(PLAN, now);

    expect(elapsedFraction(state, now + PLAN.roundDuration * 1000)).toBe(1);
  });

  it("should stay 1 once the session is finished", () => {
    const plan: TimerSessionPlan = {
      rounds: 1,
      roundDuration: 180,
      restDuration: 60,
    };
    const now = 0;
    const finished = advanceTimerSession(
      startTimerSession(plan, now),
      now + plan.roundDuration * 1000
    );

    expect(elapsedFraction(finished, now + 999_000)).toBe(1);
  });
});

describe("stopTimerSession", () => {
  it("should mark the session as finished", () => {
    const state = startTimerSession(PLAN, 0);

    const stopped = stopTimerSession(state);

    expect(stopped.status).toBe("finished");
  });
});

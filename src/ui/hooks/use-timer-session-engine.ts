"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createHtmlAudioBellAdapter } from "@/infraestructure/audio/bell.adapter";
import { formatDuration } from "@/lib/duration";
import type { BellPort } from "@/application/ports/bell.port";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import {
  advanceTimerSession,
  elapsedFraction as computeElapsedFraction,
  pauseTimerSession,
  remainingSeconds as computeRemainingSeconds,
  resumeTimerSession,
  startTimerSession,
  stopTimerSession,
  type TimerPhase,
  type TimerSessionPlan,
  type TimerSessionState,
} from "@/domain/timer-session/timer-session.model";

const TICK_MS = 200;
export const WARNING_SECONDS = 10;

const defaultBell = createHtmlAudioBellAdapter();

export type TimerSessionEngineStatus =
  "loading" | "idle" | "running" | "paused" | "finished";

export interface TimerSessionEngineDeps {
  bell?: BellPort;
}

export interface TimerSessionEngineResult {
  status: TimerSessionEngineStatus;
  name: string;
  phase: TimerPhase;
  round: number;
  totalRounds: number;
  remainingLabel: string;
  elapsedFraction: number;
  isWarning: boolean;
  showBellChip: boolean;
  showWarnChip: boolean;
  primaryLabel: string;
  primaryIcon: "play" | "pause";
  onPrimaryAction(): void;
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

export function useTimerSessionEngine(
  config: TimerConfiguration | null,
  onStop: () => void,
  deps: TimerSessionEngineDeps = {}
): TimerSessionEngineResult {
  const bell = deps.bell ?? defaultBell;

  const [session, setSession] = useState<TimerSessionState | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const configRef = useRef(config);
  const sessionRef = useRef(session);
  const bellRef = useRef(bell);
  useEffect(() => {
    configRef.current = config;
    sessionRef.current = session;
    bellRef.current = bell;
  });
  const warnedPhaseKeyRef = useRef<string | null>(null);

  useEffect(() => {
    function advance(at: number) {
      const current = sessionRef.current;
      if (!current || current.status !== "running") return;

      const next = advanceTimerSession(current, at);
      let rangThisTick = false;

      if (next !== current) {
        sessionRef.current = next;
        warnedPhaseKeyRef.current = null;
        setSession(next);
        if (configRef.current?.bellSound) {
          bellRef.current.ring();
          rangThisTick = true;
        }
      }

      if (
        !rangThisTick &&
        next.status === "running" &&
        configRef.current?.warnBeforeEnd
      ) {
        const remaining = computeRemainingSeconds(next, at);
        const phaseKey = `${next.round}-${next.phase}`;
        if (
          remaining <= WARNING_SECONDS &&
          warnedPhaseKeyRef.current !== phaseKey
        ) {
          warnedPhaseKeyRef.current = phaseKey;
          bellRef.current.ring();
        }
      }

      setNow(at);
    }

    const interval = setInterval(() => advance(Date.now()), TICK_MS);
    function onVisibilityChange() {
      if (document.visibilityState === "visible") advance(Date.now());
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const start = useCallback(() => {
    if (!config) return;
    if (config.bellSound) bell.ring();

    const plan: TimerSessionPlan = {
      rounds: config.rounds,
      roundDuration: config.roundDuration,
      restDuration: config.restDuration,
    };
    const next = startTimerSession(plan, Date.now());
    warnedPhaseKeyRef.current = null;
    sessionRef.current = next;
    setSession(next);
    setNow(Date.now());
  }, [config, bell]);

  const pause = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    const next = pauseTimerSession(current, Date.now());
    sessionRef.current = next;
    setSession(next);
  }, []);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    const next = resumeTimerSession(current, Date.now());
    sessionRef.current = next;
    setSession(next);
    setNow(Date.now());
  }, []);

  const stop = useCallback(() => {
    const current = sessionRef.current;
    if (current) {
      const next = stopTimerSession(current);
      sessionRef.current = next;
      setSession(next);
    }
    onStop();
  }, [onStop]);

  const status: TimerSessionEngineStatus = !config
    ? "loading"
    : session
      ? session.status
      : "idle";

  const remainingSecondsValue = session
    ? computeRemainingSeconds(session, now)
    : (config?.roundDuration ?? 0);
  const elapsedFractionValue = session
    ? computeElapsedFraction(session, now)
    : 0;
  const isWarning = Boolean(
    config?.warnBeforeEnd &&
    session?.status === "running" &&
    remainingSecondsValue <= WARNING_SECONDS
  );

  const primaryLabel =
    status === "idle" ? "INICIAR" : status === "paused" ? "REANUDAR" : "PAUSA";
  const primaryIcon: "play" | "pause" =
    status === "idle" || status === "paused" ? "play" : "pause";
  const onPrimaryAction =
    status === "idle" ? start : status === "paused" ? resume : pause;

  return {
    status,
    name: config?.name ?? "",
    phase: session?.phase ?? "work",
    round: session?.round ?? 1,
    totalRounds: config?.rounds ?? 0,
    remainingLabel: formatDuration(remainingSecondsValue),
    elapsedFraction: elapsedFractionValue,
    isWarning,
    showBellChip: Boolean(config?.bellSound),
    showWarnChip: Boolean(config?.warnBeforeEnd),
    primaryLabel,
    primaryIcon,
    onPrimaryAction,
    start,
    pause,
    resume,
    stop,
  };
}

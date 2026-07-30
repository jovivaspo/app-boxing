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

// A1: browser-only, non-serializable adapter constructed at module scope so
// it only runs client-side. Exposed as an overridable param below so tests
// and callers can inject a fake at the port boundary.
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

/**
 * Owns the tick/visibility/cue session engine (extracted from
 * `useTimerActive` — J) shared by the authenticated `TimerActive` hook and
 * the guest-active hook. Takes a resolved `config` (or `null` while the
 * caller is still loading it) and an `onStop` callback invoked when the
 * session is stopped — callers own their own post-stop navigation.
 */
export function useTimerSessionEngine(
  config: TimerConfiguration | null,
  onStop: () => void,
  deps: TimerSessionEngineDeps = {}
): TimerSessionEngineResult {
  const bell = deps.bell ?? defaultBell;

  const [session, setSession] = useState<TimerSessionState | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // "Latest ref" pattern: synced via an effect with no dependency array
  // (runs after every render, never during render itself) so the
  // mount-once tick effect below always reads the current config/session/bell
  // without resubscribing its interval on every render.
  const configRef = useRef(config);
  const sessionRef = useRef(session);
  const bellRef = useRef(bell);
  useEffect(() => {
    configRef.current = config;
    sessionRef.current = session;
    bellRef.current = bell;
  });
  const warnedPhaseKeyRef = useRef<string | null>(null);

  // D8/D9: setInterval(200ms) render trigger + visibilitychange recompute.
  // Cues fire from this tick callback only (never a state updater or a
  // render effect) so a StrictMode double-invoke of the effect setup can
  // never double-ring the bell — only one live interval survives cleanup.
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

      // Skip the warning check on a tick that already rang for a transition:
      // a phase shorter than WARNING_SECONDS is already inside its own
      // warning window from the instant it starts, and firing both rings
      // synchronously restarts the shared <audio> element mid-playback,
      // cutting the first one off. Leaving `warnedPhaseKeyRef` unset lets
      // the very next tick fire the warning ~TICK_MS later instead.
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

  // Status -> primary-action mapping (A2: a business rule, not a display
  // concern, so it's computed here rather than in the presentational .tsx).
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

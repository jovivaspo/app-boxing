"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createHtmlAudioBellAdapter } from "@/infraestructure/audio/bell.adapter";
import { createLocalTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/local-timer-configuration.adapter";
import { formatDuration } from "@/lib/duration";
import { useGuestTimerConfigurationLookup } from "@/ui/hooks/use-guest-timer-configuration-lookup";
import {
  advanceTimerSession,
  elapsedFraction as computeElapsedFraction,
  pauseTimerSession,
  remainingSeconds as computeRemainingSeconds,
  resumeTimerSession,
  startTimerSession,
  stopTimerSession,
  type TimerSessionPlan,
  type TimerSessionState,
} from "@/domain/timer-session/timer-session.model";

import type {
  TimerActiveDeps,
  TimerActiveProps,
  TimerActiveStatus,
  UseTimerActiveResult,
} from "./timer-active.types";

const TICK_MS = 200;
export const WARNING_SECONDS = 10;

// A1: both defaults are browser-only, non-serializable adapters constructed
// at module scope so they only run client-side. Exposed as overridable
// params below so tests and callers can inject fakes at the port boundary.
const defaultBell = createHtmlAudioBellAdapter();
const defaultLocalAdapter = createLocalTimerConfigurationAdapter();

/** Owns all Timer Activo session logic (A2): tick/visibility recompute, cues, guest lookup, navigation. */
export function useTimerActive(
  { isAuthenticated, initialConfiguration, timerId }: TimerActiveProps,
  deps: TimerActiveDeps = {}
): UseTimerActiveResult {
  const bell = deps.bell ?? defaultBell;
  const localAdapter = deps.localAdapter ?? defaultLocalAdapter;
  const router = useRouter();

  const { config: guestConfig, notFound: configError } =
    useGuestTimerConfigurationLookup(
      isAuthenticated,
      timerId,
      initialConfiguration,
      localAdapter,
      router
    );
  const config = initialConfiguration ?? guestConfig;
  const [session, setSession] = useState<TimerSessionState | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // "Latest ref" pattern: synced via an effect with no dependency array
  // (runs after every render, never during render itself — writing to
  // `ref.current` mid-render is disallowed) so the mount-once tick effect
  // below always reads the current config/session/bell without
  // resubscribing its interval on every render.
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
    // Idle/paused/finished remaining-time and progress values don't depend
    // on `now` (see `effectiveNow` in the domain model), so skip the
    // re-render entirely rather than calling `setNow` on every 200ms tick
    // for a screen that isn't actively counting down.
    function advance(at: number) {
      const current = sessionRef.current;
      if (!current || current.status !== "running") return;

      const next = advanceTimerSession(current, at);

      if (next !== current) {
        sessionRef.current = next;
        warnedPhaseKeyRef.current = null;
        setSession(next);
        if (configRef.current?.bellSound) bellRef.current.ring();
      }

      if (next.status === "running" && configRef.current?.warnBeforeEnd) {
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
    router.push("/timers");
  }, [router]);

  const status: TimerActiveStatus = configError
    ? "error"
    : !config
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
    error: configError ? "No encontramos ese timer." : null,
    primaryLabel,
    primaryIcon,
    onPrimaryAction,
    start,
    pause,
    resume,
    stop,
  };
}

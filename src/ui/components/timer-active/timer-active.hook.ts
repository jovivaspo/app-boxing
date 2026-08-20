"use client";

import { useRouter } from "next/navigation";

import { useTimerSessionEngine } from "@/ui/hooks/use-timer-session-engine";

import type {
  TimerActiveDeps,
  TimerActiveProps,
  UseTimerActiveResult,
} from "./timer-active.types";

export { WARNING_SECONDS } from "@/ui/hooks/use-timer-session-engine";

export function useTimerActive(
  { initialConfiguration }: TimerActiveProps,
  deps: TimerActiveDeps = {}
): UseTimerActiveResult {
  const router = useRouter();

  const engine = useTimerSessionEngine(
    initialConfiguration,
    () => router.push("/timers"),
    { bell: deps.bell }
  );

  return {
    status: engine.status as UseTimerActiveResult["status"],
    name: engine.name,
    phase: engine.phase,
    round: engine.round,
    totalRounds: engine.totalRounds,
    remainingLabel: engine.remainingLabel,
    elapsedFraction: engine.elapsedFraction,
    isWarning: engine.isWarning,
    showBellChip: engine.showBellChip,
    showWarnChip: engine.showWarnChip,
    primaryLabel: engine.primaryLabel,
    primaryIcon: engine.primaryIcon,
    onPrimaryAction: engine.onPrimaryAction,
    start: engine.start,
    pause: engine.pause,
    resume: engine.resume,
    stop: engine.stop,
  };
}

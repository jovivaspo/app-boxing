"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import { useTimerSessionEngine } from "@/ui/hooks/use-timer-session-engine";
import { createLocalTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/local-timer-configuration.adapter";

import type {
  GuestTimerActiveDeps,
  GuestTimerActiveProps,
  UseGuestTimerActiveResult,
} from "./guest-timer-active.types";

export { WARNING_SECONDS } from "@/ui/hooks/use-timer-session-engine";

const defaultLocalAdapter = createLocalTimerConfigurationAdapter();

export function useGuestTimerActive(
  { localAdapter = defaultLocalAdapter }: GuestTimerActiveProps,
  deps: GuestTimerActiveDeps = {}
): UseGuestTimerActiveResult {
  const router = useRouter();
  const [config, setConfig] = useState<TimerConfiguration | null>(null);

  useEffect(() => {
    let cancelled = false;

    localAdapter.read().then((record) => {
      if (cancelled) return;
      if (record) {
        setConfig(record);
      } else {
        router.replace("/guest-timer");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [localAdapter, router]);

  const engine = useTimerSessionEngine(
    config,
    () => router.push("/guest-timer"),
    { bell: deps.bell }
  );

  return {
    status: engine.status as UseGuestTimerActiveResult["status"],
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

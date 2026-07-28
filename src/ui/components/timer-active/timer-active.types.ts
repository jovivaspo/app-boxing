import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerPhase } from "@/domain/timer-session/timer-session.model";
import type { BellPort } from "@/application/ports/bell.port";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

export interface TimerActiveProps {
  isAuthenticated: boolean;
  initialConfiguration: TimerConfiguration | null;
  timerId?: string; // guest branch only
}

export type TimerActiveStatus =
  "loading" | "idle" | "running" | "paused" | "finished" | "error";

export interface TimerActiveDeps {
  bell?: BellPort;
  localAdapter?: TimerConfigurationRepositoryPort;
}

export interface UseTimerActiveResult {
  status: TimerActiveStatus;
  name: string;
  phase: TimerPhase; // "work" while idle
  round: number; // 1 while idle
  totalRounds: number;
  remainingLabel: string; // formatDuration -> "m:ss"
  elapsedFraction: number; // 0..1, drives stroke-dashoffset
  isWarning: boolean; // warnBeforeEnd && running && remaining <= 10
  showBellChip: boolean;
  showWarnChip: boolean;
  error: string | null;
  primaryLabel: string; // "INICIAR" | "REANUDAR" | "PAUSA"
  primaryIcon: "play" | "pause";
  onPrimaryAction(): void; // start | resume | pause, depending on status
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void; // stop -> router.push("/timers")
}

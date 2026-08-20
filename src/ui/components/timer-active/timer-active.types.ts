import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerPhase } from "@/domain/timer-session/timer-session.model";
import type { BellPort } from "@/application/ports/bell.port";

export interface TimerActiveProps {
  initialConfiguration: TimerConfiguration;
}

export type TimerActiveStatus = "idle" | "running" | "paused" | "finished";

export interface TimerActiveDeps {
  bell?: BellPort;
}

export interface UseTimerActiveResult {
  status: TimerActiveStatus;
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

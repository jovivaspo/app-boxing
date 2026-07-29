import type { TimerPhase } from "@/domain/timer-session/timer-session.model";
import type { BellPort } from "@/application/ports/bell.port";
import type { GuestTimerConfigurationPort } from "@/application/ports/guest-timer-configuration.port";

export interface GuestTimerActiveProps {
  localAdapter?: GuestTimerConfigurationPort;
}

export type GuestTimerActiveStatus =
  "loading" | "idle" | "running" | "paused" | "finished";

export interface GuestTimerActiveDeps {
  bell?: BellPort;
}

export interface UseGuestTimerActiveResult {
  status: GuestTimerActiveStatus;
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

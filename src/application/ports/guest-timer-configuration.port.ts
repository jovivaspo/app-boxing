import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export type GuestTimerConfigurationInput = Omit<
  TimerConfiguration,
  "id" | "name"
>;

export interface GuestTimerConfigurationPort {
  read(): Promise<TimerConfiguration | null>;
  write(config: GuestTimerConfigurationInput): Promise<TimerConfiguration>;
  clear(): Promise<void>;
}

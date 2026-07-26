import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export interface TimerConfigurationCardProps {
  config: TimerConfiguration;
  onDelete: (id: string) => void;
}

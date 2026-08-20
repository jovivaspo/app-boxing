import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export interface TimerConfigurationRepositoryPort {
  create(config: Omit<TimerConfiguration, "id">): Promise<TimerConfiguration>;
  list(): Promise<TimerConfiguration[]>;
  getById(id: string): Promise<TimerConfiguration>;
  update(config: TimerConfiguration): Promise<TimerConfiguration>;
  delete(id: string): Promise<void>;
}

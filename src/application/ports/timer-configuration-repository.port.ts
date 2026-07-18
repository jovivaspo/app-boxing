import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export interface TimerConfigurationRepositoryPort {
  /** Persists a new configuration and returns it with an assigned id. */
  create(config: Omit<TimerConfiguration, "id">): Promise<TimerConfiguration>;
  /** Returns all stored configurations. */
  list(): Promise<TimerConfiguration[]>;
  /**
   * Persists changes to the configuration identified by `config.id`.
   * @throws {import("@/domain/errors/timer-configuration-errors").TimerConfigurationNotFound} no stored record matches `config.id`.
   */
  update(config: TimerConfiguration): Promise<TimerConfiguration>;
  /**
   * Removes the configuration identified by `id`.
   * @throws {import("@/domain/errors/timer-configuration-errors").TimerConfigurationNotFound} no stored record matches `id`.
   */
  delete(id: string): Promise<void>;
}

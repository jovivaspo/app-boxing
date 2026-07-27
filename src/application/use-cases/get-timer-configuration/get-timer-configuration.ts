import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface GetTimerConfigurationDeps {
  repository: TimerConfigurationRepositoryPort;
}

/**
 * Returns the single configuration identified by `id`.
 * @throws {import("@/domain/errors/timer-configuration-errors").TimerConfigurationNotFound} no stored record matches `id`.
 */
export function getTimerConfiguration({
  repository,
}: GetTimerConfigurationDeps) {
  return function execute(id: string): Promise<TimerConfiguration> {
    return repository.getById(id);
  };
}

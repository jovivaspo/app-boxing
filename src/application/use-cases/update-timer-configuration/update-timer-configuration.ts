import { validateTimerConfiguration } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface UpdateTimerConfigurationDeps {
  repository: TimerConfigurationRepositoryPort;
}

/**
 * Validates a timer configuration and persists the changes.
 * @throws {import("@/domain/errors/timer-configuration-errors").InvalidTimerConfiguration} rounds, roundDuration, or restDuration is <= 0.
 * @throws {import("@/domain/errors/timer-configuration-errors").TimerConfigurationNotFound} no stored record matches `config.id`.
 */
export function updateTimerConfiguration({
  repository,
}: UpdateTimerConfigurationDeps) {
  return async function execute(
    config: TimerConfiguration
  ): Promise<TimerConfiguration> {
    const validated = validateTimerConfiguration(config);
    return repository.update(validated);
  };
}

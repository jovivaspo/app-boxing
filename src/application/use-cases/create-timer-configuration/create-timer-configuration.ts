import { validateTimerConfiguration } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface CreateTimerConfigurationDeps {
  repository: TimerConfigurationRepositoryPort;
}

/**
 * Validates a candidate timer configuration and persists it.
 * @throws {import("@/domain/errors/timer-configuration-errors").InvalidTimerConfiguration} rounds, roundDuration, or restDuration is <= 0.
 */
export function createTimerConfiguration({
  repository,
}: CreateTimerConfigurationDeps) {
  return async function execute(
    config: Omit<TimerConfiguration, "id">
  ): Promise<TimerConfiguration> {
    const validated = validateTimerConfiguration(config);
    return repository.create(validated);
  };
}

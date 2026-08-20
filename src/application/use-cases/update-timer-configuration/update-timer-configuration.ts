import { validateTimerConfiguration } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface UpdateTimerConfigurationDeps {
  repository: TimerConfigurationRepositoryPort;
}

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

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface GetTimerConfigurationDeps {
  repository: TimerConfigurationRepositoryPort;
}

export function getTimerConfiguration({
  repository,
}: GetTimerConfigurationDeps) {
  return function execute(id: string): Promise<TimerConfiguration> {
    return repository.getById(id);
  };
}

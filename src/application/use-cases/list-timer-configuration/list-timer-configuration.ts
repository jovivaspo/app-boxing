import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface ListTimerConfigurationsDeps {
  repository: TimerConfigurationRepositoryPort;
}

/** Returns all stored timer configurations. */
export function listTimerConfigurations({
  repository,
}: ListTimerConfigurationsDeps) {
  return function execute(): Promise<TimerConfiguration[]> {
    return repository.list();
  };
}

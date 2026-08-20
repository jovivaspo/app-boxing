import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface DeleteTimerConfigurationDeps {
  repository: TimerConfigurationRepositoryPort;
}

export function deleteTimerConfiguration({
  repository,
}: DeleteTimerConfigurationDeps) {
  return function execute(id: string): Promise<void> {
    return repository.delete(id);
  };
}

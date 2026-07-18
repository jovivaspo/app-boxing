import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

interface DeleteTimerConfigurationDeps {
  repository: TimerConfigurationRepositoryPort;
}

/**
 * Removes the configuration identified by `id`.
 * @throws {import("@/domain/errors/timer-configuration-errors").TimerConfigurationNotFound} no stored record matches `id`.
 */
export function deleteTimerConfiguration({
  repository,
}: DeleteTimerConfigurationDeps) {
  return function execute(id: string): Promise<void> {
    return repository.delete(id);
  };
}

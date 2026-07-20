import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import { getItem, setItem } from "@/infraestructure/storage/local-storage.util";

const STORAGE_KEY = "timer-configurations";

function readAll(): TimerConfiguration[] {
  return getItem<TimerConfiguration[]>(STORAGE_KEY) ?? [];
}

/**
 * Creates the `TimerConfigurationRepositoryPort` implementation backed by
 * `localStorage` — used for the guest (no session) path. Single JSON blob
 * strategy (D3): the entire array lives under one `STORAGE_KEY`.
 */
export function createLocalTimerConfigurationAdapter(): TimerConfigurationRepositoryPort {
  return {
    async create(
      config: Omit<TimerConfiguration, "id">
    ): Promise<TimerConfiguration> {
      const all = readAll();
      const created: TimerConfiguration = {
        ...config,
        id: crypto.randomUUID(),
      };
      setItem(STORAGE_KEY, [...all, created]);
      return created;
    },

    async list(): Promise<TimerConfiguration[]> {
      return readAll();
    },

    async update(config: TimerConfiguration): Promise<TimerConfiguration> {
      const all = readAll();
      const index = all.findIndex((c) => c.id === config.id);
      if (index === -1) throw timerConfigurationNotFound(config.id);

      const updated = [...all];
      updated[index] = config;
      setItem(STORAGE_KEY, updated);
      return config;
    },

    async delete(id: string): Promise<void> {
      const all = readAll();
      const remaining = all.filter((c) => c.id !== id);
      if (remaining.length === all.length) throw timerConfigurationNotFound(id);

      setItem(STORAGE_KEY, remaining);
    },
  };
}

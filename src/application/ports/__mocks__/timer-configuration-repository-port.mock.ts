import { vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";

export function makeTimerConfigurationRepositoryPort(
  overrides?: Partial<TimerConfigurationRepositoryPort>
): TimerConfigurationRepositoryPort {
  return {
    create: vi.fn().mockResolvedValue(buildTimerConfiguration()),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(buildTimerConfiguration()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

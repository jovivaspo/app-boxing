import { vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import type { GuestTimerConfigurationPort } from "@/application/ports/guest-timer-configuration.port";

export function makeGuestTimerConfigurationPort(
  overrides?: Partial<GuestTimerConfigurationPort>
): GuestTimerConfigurationPort {
  return {
    read: vi.fn().mockResolvedValue(buildTimerConfiguration()),
    write: vi.fn().mockResolvedValue(buildTimerConfiguration()),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

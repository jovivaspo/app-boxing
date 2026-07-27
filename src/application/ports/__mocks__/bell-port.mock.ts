import { vi } from "vitest";

import type { BellPort } from "@/application/ports/bell.port";

export function makeBellPort(overrides?: Partial<BellPort>): BellPort {
  return {
    ring: vi.fn(),
    ...overrides,
  };
}

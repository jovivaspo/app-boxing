import { describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";

import { listTimerConfigurations } from "../list-timer-configuration";

describe("listTimerConfigurations", () => {
  it("should return the repository's stored configurations unchanged", async () => {
    const stored = [
      buildTimerConfiguration({ id: "tc-1" }),
      buildTimerConfiguration({ id: "tc-2" }),
    ];
    const repository = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue(stored),
    });

    const result = await listTimerConfigurations({ repository })();

    expect(result).toBe(stored);
  });

  it("should return an empty array when no configurations are stored", async () => {
    const repository = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue([]),
    });

    const result = await listTimerConfigurations({ repository })();

    expect(result).toEqual([]);
  });
});

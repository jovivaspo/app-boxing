import { describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";

import { getTimerConfiguration } from "../get-timer-configuration";

describe("getTimerConfiguration", () => {
  it("should delegate to repository.getById with the given id", async () => {
    const stored = buildTimerConfiguration({ id: "tc-1" });
    const repository = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockResolvedValue(stored),
    });

    const result = await getTimerConfiguration({ repository })("tc-1");

    expect(repository.getById).toHaveBeenCalledWith("tc-1");
    expect(result).toBe(stored);
  });

  it("should propagate TimerConfigurationNotFound thrown by the repository", async () => {
    const notFoundError = timerConfigurationNotFound("missing-id");
    const repository = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockRejectedValue(notFoundError),
    });

    await expect(
      getTimerConfiguration({ repository })("missing-id")
    ).rejects.toBe(notFoundError);
  });
});

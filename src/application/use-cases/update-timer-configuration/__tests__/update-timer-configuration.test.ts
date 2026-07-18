import { describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";

import { updateTimerConfiguration } from "../update-timer-configuration";

describe("updateTimerConfiguration", () => {
  it("should validate the configuration, call the repository's update, and return the result", async () => {
    const candidate = buildTimerConfiguration({ id: "tc-1", rounds: 10 });
    const updated = buildTimerConfiguration({ id: "tc-1", rounds: 10 });
    const repository = makeTimerConfigurationRepositoryPort({
      update: vi.fn().mockResolvedValue(updated),
    });

    const result = await updateTimerConfiguration({ repository })(candidate);

    expect(repository.update).toHaveBeenCalledWith(candidate);
    expect(result).toBe(updated);
  });

  it("should reject with InvalidTimerConfiguration when rounds is not positive and never call the repository's update", async () => {
    const candidate = buildTimerConfiguration({ id: "tc-1", rounds: 0 });
    const repository = makeTimerConfigurationRepositoryPort();

    await expect(
      updateTimerConfiguration({ repository })(candidate)
    ).rejects.toMatchObject({ _tag: "InvalidTimerConfiguration" });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("should propagate TimerConfigurationNotFound when the repository rejects because the id does not exist", async () => {
    const candidate = buildTimerConfiguration({ id: "missing-id" });
    const notFoundError = timerConfigurationNotFound("missing-id");
    const repository = makeTimerConfigurationRepositoryPort({
      update: vi.fn().mockRejectedValue(notFoundError),
    });

    await expect(
      updateTimerConfiguration({ repository })(candidate)
    ).rejects.toBe(notFoundError);
  });
});

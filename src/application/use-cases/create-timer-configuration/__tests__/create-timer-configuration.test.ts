import { describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";

import { createTimerConfiguration } from "../create-timer-configuration";

describe("createTimerConfiguration", () => {
  it("should validate the configuration, call the repository's create, and return the result", async () => {
    const { id: _id, ...candidate } = buildTimerConfiguration();
    const created = buildTimerConfiguration({ id: "tc-42" });
    const repository = makeTimerConfigurationRepositoryPort({
      create: vi.fn().mockResolvedValue(created),
    });

    const result = await createTimerConfiguration({ repository })(candidate);

    expect(repository.create).toHaveBeenCalledWith(candidate);
    expect(repository.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() })
    );
    expect(result).toBe(created);
  });

  it("should reject with InvalidTimerConfiguration when rounds is not positive and never call the repository's create", async () => {
    const candidate: Omit<TimerConfiguration, "id"> = buildTimerConfiguration({
      rounds: 0,
    });
    const repository = makeTimerConfigurationRepositoryPort();

    await expect(
      createTimerConfiguration({ repository })(candidate)
    ).rejects.toMatchObject({ _tag: "InvalidTimerConfiguration" });

    expect(repository.create).not.toHaveBeenCalled();
  });
});

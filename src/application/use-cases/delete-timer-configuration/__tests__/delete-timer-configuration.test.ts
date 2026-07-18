import { describe, expect, it, vi } from "vitest";

import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";

import { deleteTimerConfiguration } from "../delete-timer-configuration";

describe("deleteTimerConfiguration", () => {
  it("should call the repository's delete with the given id and resolve with no value", async () => {
    const repository = makeTimerConfigurationRepositoryPort();

    const result = await deleteTimerConfiguration({ repository })("tc-1");

    expect(repository.delete).toHaveBeenCalledWith("tc-1");
    expect(result).toBeUndefined();
  });

  it("should propagate TimerConfigurationNotFound when the repository rejects because the id does not exist", async () => {
    const notFoundError = timerConfigurationNotFound("missing-id");
    const repository = makeTimerConfigurationRepositoryPort({
      delete: vi.fn().mockRejectedValue(notFoundError),
    });

    await expect(
      deleteTimerConfiguration({ repository })("missing-id")
    ).rejects.toBe(notFoundError);
  });
});

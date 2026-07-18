import { describe, expect, it } from "vitest";
import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { validateTimerConfiguration } from "../timer-configuration-errors";

describe("validateTimerConfiguration", () => {
  it("should reject a configuration with rounds <= 0", () => {
    const config = buildTimerConfiguration({ rounds: 0 });

    const result = validateTimerConfiguration(config);

    expect(result).toMatchObject({ _tag: "InvalidTimerConfiguration" });
  });

  it("should reject a configuration with roundDuration <= 0", () => {
    const config = buildTimerConfiguration({ roundDuration: 0 });

    const result = validateTimerConfiguration(config);

    expect(result).toMatchObject({ _tag: "InvalidTimerConfiguration" });
  });

  it("should reject a configuration with restDuration <= 0", () => {
    const config = buildTimerConfiguration({ restDuration: 0 });

    const result = validateTimerConfiguration(config);

    expect(result).toMatchObject({ _tag: "InvalidTimerConfiguration" });
  });

  it("should return the input unchanged when all fields are valid", () => {
    const config = buildTimerConfiguration();

    const result = validateTimerConfiguration(config);

    expect(result).toBe(config);
  });
});

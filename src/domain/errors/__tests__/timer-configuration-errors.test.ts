import { describe, expect, it } from "vitest";
import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import {
  timerConfigurationNotFound,
  validateTimerConfiguration,
} from "../timer-configuration-errors";

describe("validateTimerConfiguration", () => {
  it("should throw when rounds is zero", () => {
    const config = buildTimerConfiguration({ rounds: 0 });

    expect(() => validateTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should throw when rounds is negative", () => {
    const config = buildTimerConfiguration({ rounds: -1 });

    expect(() => validateTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should throw when roundDuration is zero or negative", () => {
    const config = buildTimerConfiguration({ roundDuration: 0 });

    expect(() => validateTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should throw when restDuration is zero or negative", () => {
    const config = buildTimerConfiguration({ restDuration: 0 });

    expect(() => validateTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should return the input unchanged when all fields are valid", () => {
    const config = buildTimerConfiguration();

    const result = validateTimerConfiguration(config);

    expect(result).toBe(config);
  });
});

describe("timerConfigurationNotFound", () => {
  it("should return an error tagged as TimerConfigurationNotFound", () => {
    const error = timerConfigurationNotFound("tc-1");

    expect(error._tag).toBe("TimerConfigurationNotFound");
  });

  it("should embed the given id in the error message", () => {
    const error = timerConfigurationNotFound("tc-1");

    expect(error.message).toBe("Timer configuration not found: tc-1");
  });
});

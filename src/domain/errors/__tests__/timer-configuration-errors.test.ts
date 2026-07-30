import { describe, expect, it } from "vitest";
import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import {
  MAX_DURATION_SECONDS,
  timerConfigurationNotFound,
  validateGuestTimerConfiguration,
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

  it("should throw when roundDuration exceeds the maximum duration", () => {
    const config = buildTimerConfiguration({
      roundDuration: MAX_DURATION_SECONDS + 1,
    });

    expect(() => validateTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should throw when restDuration exceeds the maximum duration", () => {
    const config = buildTimerConfiguration({
      restDuration: MAX_DURATION_SECONDS + 1,
    });

    expect(() => validateTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should not throw when durations are exactly the maximum duration", () => {
    const config = buildTimerConfiguration({
      roundDuration: MAX_DURATION_SECONDS,
      restDuration: MAX_DURATION_SECONDS,
    });

    expect(() => validateTimerConfiguration(config)).not.toThrow();
  });

  it("should return the input unchanged when all fields are valid", () => {
    const config = buildTimerConfiguration();

    const result = validateTimerConfiguration(config);

    expect(result).toBe(config);
  });
});

describe("validateGuestTimerConfiguration", () => {
  it("should throw when rounds is zero", () => {
    const config = buildTimerConfiguration({ rounds: 0 });

    expect(() => validateGuestTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should throw when roundDuration is zero or negative", () => {
    const config = buildTimerConfiguration({ roundDuration: 0 });

    expect(() => validateGuestTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should not throw when restDuration is zero or negative", () => {
    const config = buildTimerConfiguration({
      rounds: 3,
      roundDuration: 30,
      restDuration: 0,
    });

    expect(() => validateGuestTimerConfiguration(config)).not.toThrow();
  });

  it("should throw when roundDuration exceeds the maximum duration", () => {
    const config = buildTimerConfiguration({
      roundDuration: MAX_DURATION_SECONDS + 1,
    });

    expect(() => validateGuestTimerConfiguration(config)).toThrow(
      expect.objectContaining({ _tag: "InvalidTimerConfiguration" })
    );
  });

  it("should not throw when restDuration exceeds the maximum duration", () => {
    const config = buildTimerConfiguration({
      restDuration: MAX_DURATION_SECONDS + 1,
    });

    expect(() => validateGuestTimerConfiguration(config)).not.toThrow();
  });

  it("should return the input unchanged when rounds and roundDuration are valid", () => {
    const config = buildTimerConfiguration();

    const result = validateGuestTimerConfiguration(config);

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

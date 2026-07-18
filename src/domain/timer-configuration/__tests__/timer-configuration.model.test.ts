import { describe, expect, it } from "vitest";
import { buildTimerConfiguration } from "../__builders__/timer-configuration.builder";
import { calculateTimerLevel } from "../timer-configuration.model";

describe("calculateTimerLevel", () => {
  it("should classify 7 rounds as amateur", () => {
    const config = buildTimerConfiguration({ rounds: 7 });

    const level = calculateTimerLevel(config);

    expect(level).toBe("amateur");
  });

  it("should classify 8 rounds as pro", () => {
    const config = buildTimerConfiguration({ rounds: 8 });

    const level = calculateTimerLevel(config);

    expect(level).toBe("pro");
  });

  it("should classify 12 rounds as pro", () => {
    const config = buildTimerConfiguration({ rounds: 12 });

    const level = calculateTimerLevel(config);

    expect(level).toBe("pro");
  });

  it("should classify 13 rounds as elite", () => {
    const config = buildTimerConfiguration({ rounds: 13 });

    const level = calculateTimerLevel(config);

    expect(level).toBe("elite");
  });

  it("should default to amateur when rounds is non-positive", () => {
    const config = buildTimerConfiguration({ rounds: 0 });

    const level = calculateTimerLevel(config);

    expect(level).toBe("amateur");
  });
});

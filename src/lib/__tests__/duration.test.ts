import { describe, expect, it } from "vitest";

import { formatDuration, splitDuration, toTotalSeconds } from "../duration";

describe("formatDuration", () => {
  it("should format 90 seconds as 1:30", () => {
    expect(formatDuration(90)).toBe("1:30");
  });

  it("should zero-pad seconds below 10", () => {
    expect(formatDuration(5)).toBe("0:05");
  });
});

describe("splitDuration", () => {
  it("should split 90 seconds into 1 minute and 30 seconds", () => {
    expect(splitDuration(90)).toEqual({ minutes: 1, seconds: 30 });
  });
});

describe("toTotalSeconds", () => {
  it("should combine 1 minute and 30 seconds into 90 total seconds", () => {
    expect(toTotalSeconds(1, 30)).toBe(90);
  });

  it("should treat empty/NaN inputs as 0", () => {
    expect(toTotalSeconds(NaN, NaN)).toBe(0);
  });
});

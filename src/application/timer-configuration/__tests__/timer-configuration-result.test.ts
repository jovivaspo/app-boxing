import { describe, expect, it } from "vitest";

import { invalidTimerConfiguration } from "@/domain/errors/timer-configuration-errors";
import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";
import { toTimerConfigurationErrorCode } from "../timer-configuration-result";

describe("toTimerConfigurationErrorCode", () => {
  it("should map an error tagged InvalidTimerConfiguration to the invalid-configuration code", () => {
    const error = invalidTimerConfiguration();

    const code = toTimerConfigurationErrorCode(error);

    expect(code).toBe("invalid-configuration");
  });

  it("should map an error tagged TimerConfigurationNotFound to the not-found code", () => {
    const error = timerConfigurationNotFound("some-id");

    const code = toTimerConfigurationErrorCode(error);

    expect(code).toBe("not-found");
  });

  it("should map an unrecognized error to the unknown code", () => {
    const error = new Error("boom");

    const code = toTimerConfigurationErrorCode(error);

    expect(code).toBe("unknown");
  });

  it("should map a non-Error thrown value to the unknown code", () => {
    const error = "boom";

    const code = toTimerConfigurationErrorCode(error);

    expect(code).toBe("unknown");
  });
});

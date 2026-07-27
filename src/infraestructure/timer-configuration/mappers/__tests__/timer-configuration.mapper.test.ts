import { describe, expect, it } from "vitest";

import type { TimerConfigurationDto } from "@/infraestructure/timer-configuration/dto/timer-configuration.dto";
import {
  toTimerConfiguration,
  toTimerConfigurationRequestBody,
} from "@/infraestructure/timer-configuration/mappers/timer-configuration.mapper";

describe("toTimerConfiguration", () => {
  it("should map every DTO field to the domain TimerConfiguration", () => {
    const dto: TimerConfigurationDto = {
      id: "config-1",
      name: "Amateur bout",
      rounds: 4,
      roundDuration: 120,
      rest: 60,
      warnBeforeEnd: true,
      bellSound: false,
    };

    const result = toTimerConfiguration(dto);

    expect(result).toEqual({
      id: "config-1",
      name: "Amateur bout",
      rounds: 4,
      roundDuration: 120,
      restDuration: 60,
      warnBeforeEnd: true,
      bellSound: false,
    });
  });
});

describe("toTimerConfigurationRequestBody", () => {
  it("should map the domain restDuration field to the backend's rest field", () => {
    const config = {
      name: "Amateur bout",
      rounds: 4,
      roundDuration: 120,
      restDuration: 60,
      warnBeforeEnd: true,
      bellSound: false,
    };

    const result = toTimerConfigurationRequestBody(config);

    expect(result).toEqual({
      name: "Amateur bout",
      rounds: 4,
      roundDuration: 120,
      rest: 60,
      warnBeforeEnd: true,
      bellSound: false,
    });
  });

  it("should not include an id field even when the input config has one", () => {
    const config = {
      id: "config-1",
      name: "Amateur bout",
      rounds: 4,
      roundDuration: 120,
      restDuration: 60,
      warnBeforeEnd: true,
      bellSound: false,
    };

    const result = toTimerConfigurationRequestBody(config);

    expect(result).not.toHaveProperty("id");
  });
});

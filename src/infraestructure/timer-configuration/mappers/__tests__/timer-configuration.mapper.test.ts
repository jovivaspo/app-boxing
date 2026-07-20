import { describe, expect, it } from "vitest";

import type { TimerConfigurationDto } from "@/infraestructure/timer-configuration/dto/timer-configuration.dto";
import { toTimerConfiguration } from "@/infraestructure/timer-configuration/mappers/timer-configuration.mapper";

describe("toTimerConfiguration", () => {
  it("should map every DTO field to the domain TimerConfiguration", () => {
    const dto: TimerConfigurationDto = {
      id: "config-1",
      name: "Amateur bout",
      rounds: 4,
      roundDuration: 120,
      restDuration: 60,
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

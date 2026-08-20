import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationDto } from "@/infraestructure/timer-configuration/dto/timer-configuration.dto";

export function toTimerConfiguration(
  dto: TimerConfigurationDto
): TimerConfiguration {
  return {
    id: dto.id,
    name: dto.name,
    rounds: dto.rounds,
    roundDuration: dto.roundDuration,
    restDuration: dto.rest,
    warnBeforeEnd: dto.warnBeforeEnd,
    bellSound: dto.bellSound,
  };
}

export function toTimerConfigurationRequestBody(
  config: Omit<TimerConfiguration, "id">
): Omit<TimerConfigurationDto, "id"> {
  return {
    name: config.name,
    rounds: config.rounds,
    roundDuration: config.roundDuration,
    rest: config.restDuration,
    warnBeforeEnd: config.warnBeforeEnd,
    bellSound: config.bellSound,
  };
}

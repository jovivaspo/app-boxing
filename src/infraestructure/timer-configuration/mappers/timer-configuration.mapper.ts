import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationDto } from "@/infraestructure/timer-configuration/dto/timer-configuration.dto";

/** Maps the backend timer-configuration DTO to the domain `TimerConfiguration`. */
export function toTimerConfiguration(
  dto: TimerConfigurationDto
): TimerConfiguration {
  return {
    id: dto.id,
    name: dto.name,
    rounds: dto.rounds,
    roundDuration: dto.roundDuration,
    restDuration: dto.restDuration,
    warnBeforeEnd: dto.warnBeforeEnd,
    bellSound: dto.bellSound,
  };
}

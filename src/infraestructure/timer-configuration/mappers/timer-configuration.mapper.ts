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
    restDuration: dto.rest,
    warnBeforeEnd: dto.warnBeforeEnd,
    bellSound: dto.bellSound,
  };
}

/**
 * Maps a domain `TimerConfiguration` (create/update input) to the backend's
 * wire shape — the domain's `restDuration` is the backend's `rest` (an
 * intentional naming mismatch confirmed against the real API). Any `id` on
 * the input is dropped: the backend assigns it on create, and update passes
 * it via the URL path, never the body.
 */
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

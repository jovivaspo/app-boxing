import { z } from "zod";

/**
 * Raw shape returned by the timer-configuration backend endpoints
 * (`/api/v1/timer-configurations`). Validated at the infrastructure boundary
 * only — never leaks past the mapper into the domain.
 */
export const timerConfigurationDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  rounds: z.number(),
  roundDuration: z.number(),
  restDuration: z.number(),
  warnBeforeEnd: z.boolean(),
  bellSound: z.boolean(),
});

export type TimerConfigurationDto = z.infer<typeof timerConfigurationDtoSchema>;

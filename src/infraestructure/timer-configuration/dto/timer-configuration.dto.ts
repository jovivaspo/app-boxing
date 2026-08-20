import { z } from "zod";

export const timerConfigurationDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  rounds: z.number(),
  roundDuration: z.number(),
  rest: z.number(),
  warnBeforeEnd: z.boolean(),
  bellSound: z.boolean(),
});

export type TimerConfigurationDto = z.infer<typeof timerConfigurationDtoSchema>;

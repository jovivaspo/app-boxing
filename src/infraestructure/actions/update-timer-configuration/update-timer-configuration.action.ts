"use server";

import { z } from "zod";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import type { Result } from "@/application/timer-configuration/timer-configuration-result";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { updateTimerConfiguration } from "@/application/use-cases/update-timer-configuration/update-timer-configuration";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";

const configShapeSchema = z.object({
  id: z.string(),
  name: z.string(),
  rounds: z.number(),
  roundDuration: z.number(),
  restDuration: z.number(),
  warnBeforeEnd: z.boolean(),
  bellSound: z.boolean(),
});

export async function updateTimerConfigurationAction(
  config: TimerConfiguration
): Promise<Result<TimerConfiguration>> {
  const parsed = configShapeSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, code: "unknown" };
  }

  const session = await createCookieSessionAdapter().get();
  if (!session) {
    return { ok: false, code: "unauthenticated" };
  }

  let repository: TimerConfigurationRepositoryPort;
  try {
    repository = createBackendTimerConfigurationAdapter(session.token);
  } catch {
    return { ok: false, code: "unknown" };
  }

  try {
    const data = await updateTimerConfiguration({ repository })(parsed.data);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: toTimerConfigurationErrorCode(error) };
  }
}

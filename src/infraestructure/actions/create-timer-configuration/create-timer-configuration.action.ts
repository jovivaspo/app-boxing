"use server";

import { z } from "zod";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import type { Result } from "@/application/timer-configuration/timer-configuration-result";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { createTimerConfiguration } from "@/application/use-cases/create-timer-configuration/create-timer-configuration";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";

// Boundary shape validation only (type/presence) — the `>0` business rule
// stays in the domain's `validateTimerConfiguration`.
const candidateShapeSchema = z.object({
  name: z.string(),
  rounds: z.number(),
  roundDuration: z.number(),
  restDuration: z.number(),
  warnBeforeEnd: z.boolean(),
  bellSound: z.boolean(),
});

/**
 * Thin Server Action adapter creating a timer configuration. Never throws
 * across the RSC boundary — every branch resolves a `Result<TimerConfiguration>`.
 */
export async function createTimerConfigurationAction(
  config: Omit<TimerConfiguration, "id">
): Promise<Result<TimerConfiguration>> {
  const parsed = candidateShapeSchema.safeParse(config);
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
    const data = await createTimerConfiguration({ repository })(parsed.data);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: toTimerConfigurationErrorCode(error) };
  }
}

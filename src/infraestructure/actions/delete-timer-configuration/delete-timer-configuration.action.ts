"use server";

import { z } from "zod";

import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import type { Result } from "@/application/timer-configuration/timer-configuration-result";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { deleteTimerConfiguration } from "@/application/use-cases/delete-timer-configuration/delete-timer-configuration";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";

// Boundary shape validation only (type/presence).
const idShapeSchema = z.string();

/**
 * Thin Server Action adapter deleting a timer configuration by id. Never
 * throws across the RSC boundary — every branch resolves a `Result<null>`.
 */
export async function deleteTimerConfigurationAction(
  id: string
): Promise<Result<null>> {
  const parsed = idShapeSchema.safeParse(id);
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
    await deleteTimerConfiguration({ repository })(parsed.data);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, code: toTimerConfigurationErrorCode(error) };
  }
}

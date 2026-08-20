"use server";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import type { Result } from "@/application/timer-configuration/timer-configuration-result";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { listTimerConfigurations } from "@/application/use-cases/list-timer-configuration/list-timer-configuration";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";

export async function listTimerConfigurationsAction(): Promise<
  Result<TimerConfiguration[]>
> {
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
    const data = await listTimerConfigurations({ repository })();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: toTimerConfigurationErrorCode(error) };
  }
}

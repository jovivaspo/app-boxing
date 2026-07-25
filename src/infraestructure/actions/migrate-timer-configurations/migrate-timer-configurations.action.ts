"use server";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import { createTimerConfiguration } from "@/application/use-cases/create-timer-configuration/create-timer-configuration";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";

export interface MigratedItemResult {
  /** The LOCAL id (from the guest localStorage record), never the backend-generated one. */
  id: string;
  status: "migrated" | "failed";
}

function allFailed(configs: TimerConfiguration[]): MigratedItemResult[] {
  return configs.map((config) => ({
    id: config?.id,
    status: "failed" as const,
  }));
}

async function migrateOne(
  config: TimerConfiguration,
  create: (
    candidate: Omit<TimerConfiguration, "id">
  ) => Promise<TimerConfiguration>
): Promise<MigratedItemResult> {
  try {
    const { id, ...candidate } = config;
    await create(candidate);
    return { id, status: "migrated" };
  } catch {
    return { id: config?.id, status: "failed" };
  }
}

/**
 * Thin Server Action adapter (infrastructure) migrating guest localStorage
 * `TimerConfiguration` records to the backend on login. Never throws — a
 * missing session or a missing `BACKEND_URL` (the backend adapter factory
 * throws synchronously) both collapse to "migrate later": every item
 * resolves as `failed` so the caller keeps it in localStorage for a future
 * login attempt. Each item is created independently — one item's failure
 * never blocks another's resolution. The LOCAL id is always echoed back
 * (the backend-generated id is irrelevant to the caller).
 */
export async function migrateTimerConfigurations(
  configs: TimerConfiguration[]
): Promise<MigratedItemResult[]> {
  if (configs.length === 0) {
    return [];
  }

  const session = await createCookieSessionAdapter().get();
  if (!session) {
    return allFailed(configs);
  }

  let repository: TimerConfigurationRepositoryPort;
  try {
    repository = createBackendTimerConfigurationAdapter(session.token);
  } catch {
    return allFailed(configs);
  }

  const create = createTimerConfiguration({ repository });

  return Promise.all(configs.map((config) => migrateOne(config, create)));
}

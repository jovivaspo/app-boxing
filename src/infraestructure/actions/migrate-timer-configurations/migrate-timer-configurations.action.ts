"use server";

import { z } from "zod";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import { createTimerConfiguration } from "@/application/use-cases/create-timer-configuration/create-timer-configuration";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";

export interface MigratedItemResult {
  /**
   * The LOCAL id (from the guest localStorage record), never the
   * backend-generated one. `undefined` when the entry itself was too
   * malformed to have an id (e.g. `null`/non-object localStorage content).
   */
  id: string | undefined;
  status: "migrated" | "failed";
}

// ponytail: single hardcoded constant, not a configurable option — realistic
// guest presets are single digits to low tens, 50 is generous headroom.
const MAX_MIGRATION_BATCH = 50;

// Boundary shape validation only (type/presence) — the `>0` business rule
// stays in the domain's `validateTimerConfiguration`, applied per item
// inside `createTimerConfiguration`.
const timerConfigurationShapeSchema = z.object({
  id: z.string(),
  name: z.string(),
  rounds: z.number(),
  roundDuration: z.number(),
  restDuration: z.number(),
  warnBeforeEnd: z.boolean(),
  bellSound: z.boolean(),
});

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
  const parsed = timerConfigurationShapeSchema.safeParse(config);
  if (!parsed.success) {
    return { id: config?.id, status: "failed" };
  }

  try {
    const { id, ...candidate } = parsed.data;
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
  if (!Array.isArray(configs) || configs.length === 0) {
    return [];
  }

  if (configs.length > MAX_MIGRATION_BATCH) {
    return allFailed(configs);
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

"use client";

import { useMemo } from "react";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type {
  GuestTimerConfigurationInput,
  GuestTimerConfigurationPort,
} from "@/application/ports/guest-timer-configuration.port";
import type { Result } from "@/application/timer-configuration/timer-configuration-result";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { listTimerConfigurationsAction } from "@/infraestructure/actions/list-timer-configuration/list-timer-configuration.action";
import { createTimerConfigurationAction } from "@/infraestructure/actions/create-timer-configuration/create-timer-configuration.action";
import { updateTimerConfigurationAction } from "@/infraestructure/actions/update-timer-configuration/update-timer-configuration.action";
import { deleteTimerConfigurationAction } from "@/infraestructure/actions/delete-timer-configuration/delete-timer-configuration.action";
import { createLocalTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/local-timer-configuration.adapter";

export interface TimerConfigurationOperations {
  list(): Promise<Result<TimerConfiguration[]>>;
  create(
    config: Omit<TimerConfiguration, "id">
  ): Promise<Result<TimerConfiguration>>;
  update(config: TimerConfiguration): Promise<Result<TimerConfiguration>>;
  remove(id: string): Promise<Result<null>>;
}

// A1: browser-only, non-serializable adapter constructed at module scope
// (guest path) so it can only run client-side. Exposed as an overridable
// parameter below so tests can inject a fake at the port boundary.
const defaultLocalAdapter = createLocalTimerConfigurationAdapter();

// D3: guest single-record storage strips `id`/`name` before every write —
// the adapter owns both (fixed name, id generated/reused internally).
function toGuestTimerInput(
  config: TimerConfiguration | Omit<TimerConfiguration, "id">
): GuestTimerConfigurationInput {
  const { id: _id, name: _name, ...input } = config as TimerConfiguration;
  return input;
}

async function toGuestResult<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: toTimerConfigurationErrorCode(error) };
  }
}

export function useTimerConfigurations(
  isAuthenticated: boolean,
  localAdapter: GuestTimerConfigurationPort = defaultLocalAdapter
): TimerConfigurationOperations {
  return useMemo<TimerConfigurationOperations>(() => {
    if (isAuthenticated) {
      return {
        list: () => listTimerConfigurationsAction(),
        create: (config) => createTimerConfigurationAction(config),
        update: (config) => updateTimerConfigurationAction(config),
        remove: (id) => deleteTimerConfigurationAction(id),
      };
    }

    return {
      list: () =>
        toGuestResult(async () => {
          const record = await localAdapter.read();
          return record ? [record] : [];
        }),
      create: (config) =>
        toGuestResult(() => localAdapter.write(toGuestTimerInput(config))),
      update: (config) =>
        toGuestResult(() => localAdapter.write(toGuestTimerInput(config))),
      remove: () => toGuestResult(() => localAdapter.clear().then(() => null)),
    };
  }, [isAuthenticated, localAdapter]);
}

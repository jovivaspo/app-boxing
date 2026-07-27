"use client";

import { useMemo } from "react";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import type { Result } from "@/application/timer-configuration/timer-configuration-result";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { listTimerConfigurations } from "@/application/use-cases/list-timer-configuration/list-timer-configuration";
import { createTimerConfiguration } from "@/application/use-cases/create-timer-configuration/create-timer-configuration";
import { updateTimerConfiguration } from "@/application/use-cases/update-timer-configuration/update-timer-configuration";
import { deleteTimerConfiguration } from "@/application/use-cases/delete-timer-configuration/delete-timer-configuration";
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

// D1: the guest branch always runs through the same application use case as
// the authenticated Server Action, never `localAdapter.xxx()` directly, so
// domain validation (`validateTimerConfiguration`) is never skipped for
// guests only. Rejections are mapped to the same `Result<T>` shape as the
// actions, so the calling component never knows which branch ran.
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
  localAdapter: TimerConfigurationRepositoryPort = defaultLocalAdapter
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
        toGuestResult(() =>
          listTimerConfigurations({ repository: localAdapter })()
        ),
      create: (config) =>
        toGuestResult(() =>
          createTimerConfiguration({ repository: localAdapter })(config)
        ),
      update: (config) =>
        toGuestResult(() =>
          updateTimerConfiguration({ repository: localAdapter })(config)
        ),
      remove: (id) =>
        toGuestResult(() =>
          deleteTimerConfiguration({ repository: localAdapter })(id).then(
            () => null
          )
        ),
    };
  }, [isAuthenticated, localAdapter]);
}

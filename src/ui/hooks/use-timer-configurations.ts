"use client";

import { useMemo } from "react";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { Result } from "@/application/timer-configuration/timer-configuration-result";
import { listTimerConfigurationsAction } from "@/infraestructure/actions/list-timer-configuration/list-timer-configuration.action";
import { createTimerConfigurationAction } from "@/infraestructure/actions/create-timer-configuration/create-timer-configuration.action";
import { updateTimerConfigurationAction } from "@/infraestructure/actions/update-timer-configuration/update-timer-configuration.action";
import { deleteTimerConfigurationAction } from "@/infraestructure/actions/delete-timer-configuration/delete-timer-configuration.action";

export interface TimerConfigurationOperations {
  list(): Promise<Result<TimerConfiguration[]>>;
  create(
    config: Omit<TimerConfiguration, "id">
  ): Promise<Result<TimerConfiguration>>;
  update(config: TimerConfiguration): Promise<Result<TimerConfiguration>>;
  remove(id: string): Promise<Result<null>>;
}

export function useTimerConfigurations(): TimerConfigurationOperations {
  return useMemo<TimerConfigurationOperations>(
    () => ({
      list: () => listTimerConfigurationsAction(),
      create: (config) => createTimerConfigurationAction(config),
      update: (config) => updateTimerConfigurationAction(config),
      remove: (id) => deleteTimerConfigurationAction(id),
    }),
    []
  );
}

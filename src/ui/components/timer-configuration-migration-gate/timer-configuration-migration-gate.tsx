"use client";

import { useTimerConfigurationMigration } from "./timer-configuration-migration-gate.hook";
import type { TimerConfigurationMigrationGateProps } from "./timer-configuration-migration-gate.types";

/**
 * Blocks rendering of `children` until every guest localStorage timer
 * configuration has resolved (migrated or failed) against the backend.
 * Renders nothing while migrating — silent by design, no spinner.
 */
export function TimerConfigurationMigrationGate({
  children,
}: TimerConfigurationMigrationGateProps) {
  const { isMigrating } = useTimerConfigurationMigration();

  if (isMigrating) {
    return null;
  }

  return children;
}

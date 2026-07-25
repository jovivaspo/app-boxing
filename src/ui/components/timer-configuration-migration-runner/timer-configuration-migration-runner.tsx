"use client";

import { useTimerConfigurationMigration } from "./timer-configuration-migration-runner.hook";

/**
 * Mounts the background timer-configuration migration effect (R1) and
 * renders nothing. Never gates or wraps content — the authenticated page
 * renders unconditionally regardless of migration progress.
 */
export function TimerConfigurationMigrationRunner() {
  useTimerConfigurationMigration();

  return null;
}

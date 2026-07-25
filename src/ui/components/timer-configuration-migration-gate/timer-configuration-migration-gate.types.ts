import type { ReactNode } from "react";

export interface TimerConfigurationMigrationGateProps {
  children: ReactNode;
}

export interface UseTimerConfigurationMigrationResult {
  isMigrating: boolean;
}

"use client";

import Link from "next/link";

import { Button } from "@/ui/components/shadcn/button";
import { TimerConfigurationCard } from "@/ui/components/timer-configuration-card";

import { useTimerConfigurationList } from "./timer-configuration-list.hook";
import type { TimerConfigurationListProps } from "./timer-configuration-list.types";

/** Presentational only (A2): all logic lives in the hook. */
export function TimerConfigurationList({
  isAuthenticated,
}: TimerConfigurationListProps) {
  const { configurations, isEmpty, error, remove } =
    useTimerConfigurationList(isAuthenticated);

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}

      {isEmpty ? (
        <p className="text-muted-foreground text-sm">
          Todavía no tenés timers. Creá el primero.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {configurations.map((config) => (
            <TimerConfigurationCard
              key={config.id}
              config={config}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      <Button asChild>
        <Link href="/timers/new">Nuevo Timer</Link>
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { TimerConfigurationCard } from "@/ui/components/timer-configuration-card";

import { useTimerConfigurationList } from "./timer-configuration-list.hook";

/** Presentational only (A2): all logic lives in the hook, authenticated-only. */
export function TimerConfigurationList() {
  const { configurations, isEmpty, error, remove } =
    useTimerConfigurationList();

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      {error && <p className="text-destructive text-sm">{error}</p>}

      {isEmpty ? (
        <p className="text-muted-foreground text-sm">
          Todavía no tenés timers. Creá el primero.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {configurations.map((config) => (
            <TimerConfigurationCard
              key={config.id}
              config={config}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      <Link
        href="/timers/new"
        className="group border-border hover:bg-muted active:bg-primary/20 flex min-h-[220px] flex-col items-center justify-center border-2 border-dashed transition-all duration-200"
      >
        <div className="border-border group-hover:border-primary flex size-16 items-center justify-center border-2 transition-colors">
          <Plus className="size-6" />
        </div>
        <span className="font-heading text-muted-foreground group-hover:text-foreground mt-4 text-xl uppercase">
          Nuevo Timer
        </span>
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";

import {
  calculateTimerLevel,
  type TimerLevel,
} from "@/domain/timer-configuration/timer-configuration.model";
import { formatDuration } from "@/lib/duration";
import { Button } from "@/ui/components/shadcn/button";

import type { TimerConfigurationCardProps } from "./timer-configuration-card.types";

const LEVEL_LABEL: Record<TimerLevel, string> = {
  amateur: "Amateur",
  pro: "Pro",
  elite: "Elite",
};

/** Presentational only — no logic beyond deriving display values from props. */
export function TimerConfigurationCard({
  config,
  onDelete,
}: TimerConfigurationCardProps) {
  const level = calculateTimerLevel(config);

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{config.name}</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {LEVEL_LABEL[level]}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          {config.rounds} rounds · {formatDuration(config.roundDuration)}{" "}
          trabajo · {formatDuration(config.restDuration)} descanso
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/timers/${config.id}/edit`}>Editar</Link>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(config.id)}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}

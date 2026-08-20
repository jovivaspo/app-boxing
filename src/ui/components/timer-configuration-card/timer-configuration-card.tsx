"use client";

import Link from "next/link";
import { Pencil, Play, Trash2 } from "lucide-react";

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

export function TimerConfigurationCard({
  config,
  onDelete,
}: TimerConfigurationCardProps) {
  const level = calculateTimerLevel(config);

  return (
    <div className="group border-border bg-card relative flex flex-col justify-between border-2 transition-all duration-200 active:scale-[0.98]">
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <span className="bg-primary text-primary-foreground border border-black/20 px-2 py-1 font-mono text-[10px] tracking-widest uppercase">
            {LEVEL_LABEL[level]}
          </span>
          <div className="flex gap-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Iniciar ${config.name}`}
              className="text-muted-foreground hover:text-primary"
            >
              <Link href={`/timers/${config.id}/active`}>
                <Play className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Editar ${config.name}`}
              className="text-muted-foreground hover:text-primary"
            >
              <Link href={`/timers/${config.id}/edit`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${config.name}`}
              className="text-destructive/70 hover:text-destructive"
              onClick={() => onDelete(config.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <h3 className="font-heading mb-8 text-2xl uppercase">{config.name}</h3>

        <div className="border-border grid grid-cols-3 gap-2 border-t pt-6">
          <div className="flex flex-col">
            <span className="text-muted-foreground font-mono text-[10px] uppercase">
              Rounds
            </span>
            <span className="font-heading text-foreground text-4xl">
              {config.rounds}
            </span>
          </div>
          <div className="border-border flex flex-col border-l pl-4">
            <span className="text-muted-foreground font-mono text-[10px] uppercase">
              Trabajo
            </span>
            <span className="font-heading text-foreground text-4xl">
              {formatDuration(config.roundDuration)}
            </span>
          </div>
          <div className="border-border flex flex-col border-l pl-4">
            <span className="text-muted-foreground font-mono text-[10px] uppercase">
              Descanso
            </span>
            <span className="font-heading text-foreground text-4xl">
              {formatDuration(config.restDuration)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-primary h-1 w-full" />
    </div>
  );
}

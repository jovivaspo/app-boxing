"use client";

import Link from "next/link";
import { Bell, Pause, Play, Square, TriangleAlert } from "lucide-react";

import type { TimerPhase } from "@/domain/timer-session/timer-session.model";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/shadcn/button";

import {
  useGuestTimerActive,
  WARNING_SECONDS,
} from "./guest-timer-active.hook";
import type { GuestTimerActiveProps } from "./guest-timer-active.types";

const PHASE_LABEL: Record<TimerPhase, string> = {
  work: "TRABAJO",
  rest: "DESCANSO",
};

const PHASE_BADGE_CLASS: Record<TimerPhase, string> = {
  work: "bg-primary text-primary-foreground",
  rest: "bg-accent text-accent-foreground",
};

const PHASE_RING_CLASS: Record<TimerPhase, string> = {
  work: "stroke-primary",
  rest: "stroke-accent",
};

export function GuestTimerActive(props: GuestTimerActiveProps) {
  const {
    status,
    name,
    phase,
    round,
    totalRounds,
    remainingLabel,
    elapsedFraction,
    isWarning,
    showBellChip,
    showWarnChip,
    primaryLabel,
    primaryIcon,
    onPrimaryAction,
    stop,
  } = useGuestTimerActive(props);

  if (status === "finished") {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-between p-4">
        <div className="flex gap-2" />

        <div className="flex flex-col items-center gap-2">
          <span className="bg-muted text-muted-foreground px-2 py-1 font-mono text-[10px] tracking-widest uppercase">
            COMPLETADO
          </span>
          <span
            aria-hidden
            className="font-heading text-foreground text-7xl tabular-nums"
          >
            0:00
          </span>
        </div>

        <Button
          asChild
          className="font-heading h-16 w-full max-w-md rounded-none text-lg uppercase italic"
        >
          <Link href="/guest-timer">VOLVER</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-between p-4">
      <div className="flex gap-2">
        {showBellChip && (
          <span className="border-border bg-card flex items-center gap-1 border px-3 py-1 font-mono text-[10px] tracking-widest uppercase">
            <Bell className="size-3" />
          </span>
        )}
        {showWarnChip && (
          <span
            className={cn(
              "border-border flex items-center gap-1 border px-3 py-1 font-mono text-[10px] tracking-widest uppercase",
              isWarning ? "bg-primary text-primary-foreground" : "bg-card"
            )}
          >
            <TriangleAlert className="size-3" />
            {WARNING_SECONDS}S
          </span>
        )}
      </div>

      <div className="relative flex size-72 items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          role="presentation"
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx={50}
            cy={50}
            r={45}
            fill="none"
            strokeWidth={6}
            className="stroke-border"
          />
          <circle
            cx={50}
            cy={50}
            r={45}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={elapsedFraction * 100}
            className={cn(
              "transition-[stroke-dashoffset] duration-200 ease-linear motion-reduce:transition-none",
              PHASE_RING_CLASS[phase]
            )}
          />
        </svg>

        <div className="flex flex-col items-center gap-2">
          <span
            className={cn(
              "px-2 py-1 font-mono text-[10px] tracking-widest uppercase",
              PHASE_BADGE_CLASS[phase]
            )}
          >
            {PHASE_LABEL[phase]}
          </span>
          <span
            aria-hidden
            className={cn(
              "font-heading text-foreground text-7xl tabular-nums",
              isWarning && "text-primary motion-safe:animate-pulse"
            )}
          >
            {remainingLabel}
          </span>
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            PROGRESO ACTUAL
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-heading text-xl uppercase">ROUND {round}</span>
          <span className="text-muted-foreground font-mono text-xs">
            / {totalRounds}
          </span>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={stop}
            className="font-heading h-20 flex-col gap-1 rounded-none text-xs tracking-widest uppercase"
          >
            <Square className="size-5" />
            PARAR
          </Button>
          <Button
            type="button"
            onClick={onPrimaryAction}
            className="font-heading h-20 flex-col gap-1 rounded-none text-xs tracking-widest uppercase"
          >
            {primaryIcon === "play" ? (
              <Play className="size-5" />
            ) : (
              <Pause className="size-5" />
            )}
            {primaryLabel}
          </Button>
        </div>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {name}: {PHASE_LABEL[phase]}, ROUND {round} de {totalRounds}
      </span>
    </div>
  );
}

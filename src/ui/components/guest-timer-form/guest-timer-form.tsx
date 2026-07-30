"use client";

import { Play } from "lucide-react";

import { Button } from "@/ui/components/shadcn/button";
import { Switch } from "@/ui/components/shadcn/switch";
import { RoundsStepper } from "@/ui/components/rounds-stepper";

import { useGuestTimerForm } from "./guest-timer-form.hook";
import type { GuestTimerFormProps } from "./guest-timer-form.types";

const DURATION_INPUT_CLASSNAME =
  "font-heading text-primary w-12 border-none bg-transparent p-0 text-center text-2xl focus:border-b-2 focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Presentational only (A2): all logic lives in `useGuestTimerForm`. No `name` field — guest-only route. */
export function GuestTimerForm(props: GuestTimerFormProps) {
  const {
    form,
    isStartEnabled,
    isSubmitting,
    setRounds,
    setRoundMinutes,
    setRoundSeconds,
    setRestMinutes,
    setRestSeconds,
    setWarnBeforeEnd,
    setBellSound,
    handleSubmit,
  } = useGuestTimerForm(props);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-6"
    >
      <div className="border-border bg-card flex flex-col gap-2 border-2 p-6">
        <span className="text-tertiary font-mono text-xs tracking-widest uppercase">
          Asaltos / Rounds
        </span>
        <RoundsStepper value={form.rounds} onChange={setRounds} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border-border bg-card flex flex-col gap-2 border p-4">
          <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Trabajo
          </span>
          <div className="flex items-baseline justify-center gap-1">
            <input
              type="number"
              min={0}
              aria-label="Minutos de trabajo"
              value={form.roundMinutes}
              onChange={(event) => setRoundMinutes(event.target.value)}
              className={DURATION_INPUT_CLASSNAME}
            />
            <span className="font-heading text-muted-foreground text-2xl">
              :
            </span>
            <input
              type="number"
              min={0}
              aria-label="Segundos de trabajo"
              value={form.roundSeconds}
              onChange={(event) => setRoundSeconds(event.target.value)}
              className={DURATION_INPUT_CLASSNAME}
            />
          </div>
        </div>

        <div className="border-border bg-card flex flex-col gap-2 border p-4">
          <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Descanso
          </span>
          <div className="flex items-baseline justify-center gap-1">
            <input
              type="number"
              min={0}
              aria-label="Minutos de descanso"
              value={form.restMinutes}
              onChange={(event) => setRestMinutes(event.target.value)}
              className={DURATION_INPUT_CLASSNAME}
            />
            <span className="font-heading text-muted-foreground text-2xl">
              :
            </span>
            <input
              type="number"
              min={0}
              aria-label="Segundos de descanso"
              value={form.restSeconds}
              onChange={(event) => setRestSeconds(event.target.value)}
              className={DURATION_INPUT_CLASSNAME}
            />
          </div>
        </div>
      </div>

      <div className="border-border flex flex-col gap-1 border-t pt-6">
        <h3 className="text-primary font-mono text-xs tracking-widest uppercase">
          Ajustes Avanzados
        </h3>
        <div className="border-border flex items-center justify-between border-b py-3">
          <label
            htmlFor="warn-before-end"
            className="text-sm font-bold tracking-tight uppercase"
          >
            Avisar antes de terminar
          </label>
          <Switch
            id="warn-before-end"
            checked={form.warnBeforeEnd}
            onCheckedChange={setWarnBeforeEnd}
          />
        </div>
        <div className="flex items-center justify-between py-3">
          <label
            htmlFor="bell-sound"
            className="text-sm font-bold tracking-tight uppercase"
          >
            Sonido de campana
          </label>
          <Switch
            id="bell-sound"
            checked={form.bellSound}
            onCheckedChange={setBellSound}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={!isStartEnabled || isSubmitting}
        className="font-heading h-16 w-full gap-2 rounded-none text-lg uppercase italic"
      >
        <Play className="size-5" />
        START
      </Button>
    </form>
  );
}

"use client";

import { Save } from "lucide-react";

import { Button } from "@/ui/components/shadcn/button";
import { Switch } from "@/ui/components/shadcn/switch";
import { RoundsStepper } from "@/ui/components/rounds-stepper";

import { useTimerConfigurationForm } from "./timer-configuration-form.hook";
import type { TimerConfigurationFormProps } from "./timer-configuration-form.types";

const DURATION_INPUT_CLASSNAME =
  "font-heading text-primary w-12 border-none bg-transparent p-0 text-center text-2xl focus:border-b-2 focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Presentational only (A2): all logic lives in the hook. */
export function TimerConfigurationForm(props: TimerConfigurationFormProps) {
  const {
    form,
    fieldErrors,
    formError,
    isSubmitting,
    setName,
    setRounds,
    setRoundMinutes,
    setRoundSeconds,
    setRestMinutes,
    setRestSeconds,
    setWarnBeforeEnd,
    setBellSound,
    handleSubmit,
  } = useTimerConfigurationForm(props);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-6"
    >
      {formError && <p className="text-destructive text-sm">{formError}</p>}

      {props.isAuthenticated && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="name"
            className="text-muted-foreground font-mono text-xs tracking-widest uppercase"
          >
            Nombre del Timer
          </label>
          <input
            type="text"
            id="name"
            value={form.name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="EJ. SACO PESADO"
            className="border-border text-primary font-heading placeholder:text-muted-foreground/50 focus:border-primary border-b-2 bg-transparent p-2 text-xl focus:outline-none"
          />
        </div>
      )}

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
          {fieldErrors.roundDuration && (
            <p className="text-destructive text-xs">
              {fieldErrors.roundDuration}
            </p>
          )}
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
          {fieldErrors.restDuration && (
            <p className="text-destructive text-xs">
              {fieldErrors.restDuration}
            </p>
          )}
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
        disabled={isSubmitting}
        className="font-heading h-16 w-full gap-2 rounded-none text-lg uppercase italic"
      >
        <Save className="size-5" />
        Guardar Timer
      </Button>
    </form>
  );
}

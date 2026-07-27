"use client";

import { Button } from "@/ui/components/shadcn/button";
import { Input } from "@/ui/components/shadcn/input";
import { Switch } from "@/ui/components/shadcn/switch";
import { RoundsStepper } from "@/ui/components/rounds-stepper";

import { useTimerConfigurationForm } from "./timer-configuration-form.hook";
import type { TimerConfigurationFormProps } from "./timer-configuration-form.types";

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
      className="flex w-full max-w-md flex-col gap-4"
    >
      {formError && <p className="text-destructive text-sm">{formError}</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Nombre
        </label>
        <Input
          id="name"
          value={form.name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Rounds</span>
        <RoundsStepper value={form.rounds} onChange={setRounds} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Duración de trabajo</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            aria-label="Minutos de trabajo"
            value={form.roundMinutes}
            onChange={(event) => setRoundMinutes(event.target.value)}
          />
          <Input
            type="number"
            min={0}
            aria-label="Segundos de trabajo"
            value={form.roundSeconds}
            onChange={(event) => setRoundSeconds(event.target.value)}
          />
        </div>
        {fieldErrors.roundDuration && (
          <p className="text-destructive text-sm">
            {fieldErrors.roundDuration}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Duración de descanso</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            aria-label="Minutos de descanso"
            value={form.restMinutes}
            onChange={(event) => setRestMinutes(event.target.value)}
          />
          <Input
            type="number"
            min={0}
            aria-label="Segundos de descanso"
            value={form.restSeconds}
            onChange={(event) => setRestSeconds(event.target.value)}
          />
        </div>
        {fieldErrors.restDuration && (
          <p className="text-destructive text-sm">{fieldErrors.restDuration}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4">
        <p className="text-sm font-medium">Ajustes Avanzados</p>
        <div className="flex items-center justify-between">
          <label htmlFor="warn-before-end" className="text-sm">
            Avisar antes de terminar
          </label>
          <Switch
            id="warn-before-end"
            checked={form.warnBeforeEnd}
            onCheckedChange={setWarnBeforeEnd}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="bell-sound" className="text-sm">
            Sonido de campana
          </label>
          <Switch
            id="bell-sound"
            checked={form.bellSound}
            onCheckedChange={setBellSound}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        Guardar Timer
      </Button>
    </form>
  );
}

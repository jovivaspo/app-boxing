"use client";

import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { splitDuration, toTotalSeconds } from "@/lib/duration";
import { useTimerConfigurations } from "@/ui/hooks/use-timer-configurations";

import type {
  TimerConfigurationFieldErrors,
  TimerConfigurationFormProps,
  TimerConfigurationFormState,
  UseTimerConfigurationFormResult,
} from "./timer-configuration-form.types";

const EMPTY_FORM: TimerConfigurationFormState = {
  name: "",
  rounds: 1,
  roundMinutes: 0,
  roundSeconds: 0,
  restMinutes: 0,
  restSeconds: 0,
  warnBeforeEnd: true,
  bellSound: true,
};

const ERROR_CODE_COPY: Record<TimerConfigurationErrorCode, string> = {
  "invalid-configuration": "Revisá los valores ingresados.",
  "not-found": "No encontramos ese timer.",
  unauthenticated: "Tu sesión expiró. Iniciá sesión de nuevo.",
  unknown: "Ocurrió un error. Intentá de nuevo.",
};

function toFormState(config: TimerConfiguration): TimerConfigurationFormState {
  const round = splitDuration(config.roundDuration);
  const rest = splitDuration(config.restDuration);
  return {
    name: config.name,
    rounds: config.rounds,
    roundMinutes: round.minutes,
    roundSeconds: round.seconds,
    restMinutes: rest.minutes,
    restSeconds: rest.seconds,
    warnBeforeEnd: config.warnBeforeEnd,
    bellSound: config.bellSound,
  };
}

/** Owns all create/edit form logic (A2), authenticated-only, shared by /timers/new and /timers/[id]/edit. */
export function useTimerConfigurationForm({
  initialConfiguration,
}: TimerConfigurationFormProps): UseTimerConfigurationFormResult {
  const router = useRouter();
  const ops = useTimerConfigurations();
  const [form, setForm] = useState<TimerConfigurationFormState>(
    initialConfiguration ? toFormState(initialConfiguration) : EMPTY_FORM
  );
  const [fieldErrors, setFieldErrors] = useState<TimerConfigurationFieldErrors>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editingId = initialConfiguration?.id;

  const setName = useCallback(
    (value: string) => setForm((f) => ({ ...f, name: value })),
    []
  );
  const setRounds = useCallback(
    (value: number) => setForm((f) => ({ ...f, rounds: value })),
    []
  );
  const setRoundMinutes = useCallback(
    (value: number) => setForm((f) => ({ ...f, roundMinutes: value })),
    []
  );
  const setRoundSeconds = useCallback(
    (value: number) => setForm((f) => ({ ...f, roundSeconds: value })),
    []
  );
  const setRestMinutes = useCallback(
    (value: number) => setForm((f) => ({ ...f, restMinutes: value })),
    []
  );
  const setRestSeconds = useCallback(
    (value: number) => setForm((f) => ({ ...f, restSeconds: value })),
    []
  );
  const setWarnBeforeEnd = useCallback(
    (value: boolean) => setForm((f) => ({ ...f, warnBeforeEnd: value })),
    []
  );
  const setBellSound = useCallback(
    (value: boolean) => setForm((f) => ({ ...f, bellSound: value })),
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const roundDuration = toTotalSeconds(
        form.roundMinutes,
        form.roundSeconds
      );
      const restDuration = toTotalSeconds(form.restMinutes, form.restSeconds);
      const errors: TimerConfigurationFieldErrors = {};
      if (roundDuration <= 0) {
        errors.roundDuration = "La duración de trabajo debe ser mayor a 0.";
      }
      if (restDuration <= 0) {
        errors.restDuration = "La duración de descanso debe ser mayor a 0.";
      }
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;

      const candidate = {
        name: form.name,
        rounds: form.rounds,
        roundDuration,
        restDuration,
        warnBeforeEnd: form.warnBeforeEnd,
        bellSound: form.bellSound,
      };

      setIsSubmitting(true);
      const request = editingId
        ? ops.update({ id: editingId, ...candidate })
        : ops.create(candidate);

      request.then((result) => {
        setIsSubmitting(false);
        if (result.ok) {
          router.push("/timers");
        } else {
          setFormError(ERROR_CODE_COPY[result.code]);
        }
      });
    },
    [form, ops, editingId, router]
  );

  return {
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
  };
}

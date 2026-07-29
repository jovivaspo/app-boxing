"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { GuestTimerConfigurationPort } from "@/application/ports/guest-timer-configuration.port";
import type { TimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { splitDuration, toTotalSeconds } from "@/lib/duration";
import { useTimerConfigurations } from "@/ui/hooks/use-timer-configurations";
import { createLocalTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/local-timer-configuration.adapter";

import type {
  TimerConfigurationFieldErrors,
  TimerConfigurationFormProps,
  TimerConfigurationFormState,
  UseTimerConfigurationFormResult,
} from "./timer-configuration-form.types";

// A1: browser-only, non-serializable adapter constructed at module scope so
// it can only run client-side. Exposed as an overridable parameter below so
// tests can inject a fake at the port boundary; also forwarded into
// `useTimerConfigurations` so a single instance is injectable in one place.
const defaultLocalAdapter = createLocalTimerConfigurationAdapter();

const EMPTY_FORM: TimerConfigurationFormState = {
  name: "",
  rounds: 1,
  roundMinutes: "",
  roundSeconds: "",
  restMinutes: "",
  restSeconds: "",
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
    roundMinutes: String(round.minutes),
    roundSeconds: String(round.seconds),
    restMinutes: String(rest.minutes),
    restSeconds: String(rest.seconds),
    warnBeforeEnd: config.warnBeforeEnd,
    bellSound: config.bellSound,
  };
}

/** Owns all create/edit form logic (A2), shared by /timers/new and /timers/[id]/edit. */
export function useTimerConfigurationForm(
  {
    isAuthenticated,
    initialConfiguration,
    timerId,
  }: TimerConfigurationFormProps,
  localAdapter: GuestTimerConfigurationPort = defaultLocalAdapter
): UseTimerConfigurationFormResult {
  const router = useRouter();
  const ops = useTimerConfigurations(isAuthenticated, localAdapter);
  const [form, setForm] = useState<TimerConfigurationFormState>(
    initialConfiguration ? toFormState(initialConfiguration) : EMPTY_FORM
  );
  const [fieldErrors, setFieldErrors] = useState<TimerConfigurationFieldErrors>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editingId = initialConfiguration?.id ?? timerId;

  // D3: single-record storage — read() resolves the guest's one stored
  // config (or null), ignoring `timerId`; never rejects, so no catch needed.
  useEffect(() => {
    if (isAuthenticated || !timerId || initialConfiguration) return;

    let cancelled = false;
    localAdapter.read().then((resolved) => {
      if (cancelled) return;
      if (resolved) {
        setForm(toFormState(resolved));
      } else {
        router.replace("/timers");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, timerId, initialConfiguration, localAdapter, router]);

  const setName = useCallback(
    (value: string) => setForm((f) => ({ ...f, name: value })),
    []
  );
  const setRounds = useCallback(
    (value: number) => setForm((f) => ({ ...f, rounds: value })),
    []
  );
  const setRoundMinutes = useCallback(
    (value: string) => setForm((f) => ({ ...f, roundMinutes: value })),
    []
  );
  const setRoundSeconds = useCallback(
    (value: string) => setForm((f) => ({ ...f, roundSeconds: value })),
    []
  );
  const setRestMinutes = useCallback(
    (value: string) => setForm((f) => ({ ...f, restMinutes: value })),
    []
  );
  const setRestSeconds = useCallback(
    (value: string) => setForm((f) => ({ ...f, restSeconds: value })),
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
        Number(form.roundMinutes),
        Number(form.roundSeconds)
      );
      const restDuration = toTotalSeconds(
        Number(form.restMinutes),
        Number(form.restSeconds)
      );
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

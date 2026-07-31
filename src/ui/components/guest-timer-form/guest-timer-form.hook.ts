"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { splitDuration, toTotalSeconds } from "@/lib/duration";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import { createLocalTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/local-timer-configuration.adapter";
import { useHydrated } from "@/ui/hooks/use-hydrated";

import type {
  GuestTimerFormProps,
  GuestTimerFormState,
  UseGuestTimerFormResult,
} from "./guest-timer-form.types";

const EMPTY_FORM: GuestTimerFormState = {
  rounds: 0,
  roundMinutes: "",
  roundSeconds: "",
  restMinutes: "",
  restSeconds: "",
  warnBeforeEnd: true,
  bellSound: true,
};

// A1: browser-only, non-serializable adapter constructed at module scope so
// it only runs client-side. Exposed as an overridable param so tests and
// callers can inject a fake at the port boundary.
const defaultLocalAdapter = createLocalTimerConfigurationAdapter();

function toFormState(config: TimerConfiguration): GuestTimerFormState {
  const round = splitDuration(config.roundDuration);
  const rest = splitDuration(config.restDuration);
  return {
    rounds: config.rounds,
    roundMinutes: String(round.minutes),
    roundSeconds: String(round.seconds),
    restMinutes: String(rest.minutes),
    restSeconds: String(rest.seconds),
    warnBeforeEnd: config.warnBeforeEnd,
    bellSound: config.bellSound,
  };
}

/** Owns the guest-only `/guest-timer` form logic (A2): no `name` field, START gated on rounds/roundDuration only. */
export function useGuestTimerForm({
  localAdapter = defaultLocalAdapter,
}: GuestTimerFormProps): UseGuestTimerFormResult {
  const router = useRouter();
  const [form, setForm] = useState<GuestTimerFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useHydrated();

  // Prefill from the guest's existing single record, if any, so returning to
  // `/guest-timer` after a previous START edits the same config instead of
  // always starting blank.
  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;

    localAdapter.read().then((existing) => {
      if (cancelled || !existing) return;
      setForm(toFormState(existing));
    });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, localAdapter]);

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

  const roundDuration = toTotalSeconds(
    Number(form.roundMinutes),
    Number(form.roundSeconds)
  );
  const restDuration = toTotalSeconds(
    Number(form.restMinutes),
    Number(form.restSeconds)
  );
  const isStartEnabled = form.rounds > 0 && roundDuration > 0;

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isStartEnabled) return;

      setIsSubmitting(true);
      localAdapter
        .write({
          rounds: form.rounds,
          roundDuration,
          restDuration,
          warnBeforeEnd: form.warnBeforeEnd,
          bellSound: form.bellSound,
        })
        .then(() => {
          router.push("/guest-timer-active");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [isStartEnabled, localAdapter, form, roundDuration, restDuration, router]
  );

  return {
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
  };
}

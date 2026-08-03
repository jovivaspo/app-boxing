"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import { splitDuration, toTotalSeconds } from "@/lib/duration";
import { useIsHydrated } from "@/ui/hooks/use-is-hydrated";
import { createLocalTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/local-timer-configuration.adapter";

import type {
  GuestTimerFormProps,
  GuestTimerFormState,
  UseGuestTimerFormResult,
} from "./guest-timer-form.types";

const EMPTY_FORM: GuestTimerFormState = {
  rounds: 1,
  roundMinutes: 0,
  roundSeconds: 0,
  restMinutes: 0,
  restSeconds: 0,
  warnBeforeEnd: true,
  bellSound: true,
};

// A1: browser-only, non-serializable adapter constructed at module scope so
// it only runs client-side. Exposed as an overridable param so tests and
// callers can inject a fake at the port boundary.
const defaultLocalAdapter = createLocalTimerConfigurationAdapter();

/** Owns the guest-only `/guest-timer` form logic (A2): no `name` field, START gated on rounds/roundDuration only. */
export function useGuestTimerForm({
  localAdapter = defaultLocalAdapter,
}: GuestTimerFormProps): UseGuestTimerFormResult {
  const router = useRouter();
  const [form, setForm] = useState<GuestTimerFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    localAdapter.read().then((record) => {
      if (cancelled || !record) return;
      setForm(toFormState(record));
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

  const roundDuration = toTotalSeconds(form.roundMinutes, form.roundSeconds);
  const restDuration = toTotalSeconds(form.restMinutes, form.restSeconds);
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

function toFormState(config: TimerConfiguration): GuestTimerFormState {
  const round = splitDuration(config.roundDuration);
  const rest = splitDuration(config.restDuration);
  return {
    rounds: config.rounds,
    roundMinutes: round.minutes,
    roundSeconds: round.seconds,
    restMinutes: rest.minutes,
    restSeconds: rest.seconds,
    warnBeforeEnd: config.warnBeforeEnd,
    bellSound: config.bellSound,
  };
}

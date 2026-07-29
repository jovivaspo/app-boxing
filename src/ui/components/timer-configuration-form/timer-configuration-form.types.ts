import type { FormEvent } from "react";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export interface TimerConfigurationFormProps {
  initialConfiguration: TimerConfiguration | null;
}

export interface TimerConfigurationFormState {
  name: string;
  rounds: number;
  roundMinutes: string;
  roundSeconds: string;
  restMinutes: string;
  restSeconds: string;
  warnBeforeEnd: boolean;
  bellSound: boolean;
}

export interface TimerConfigurationFieldErrors {
  roundDuration?: string;
  restDuration?: string;
}

export interface UseTimerConfigurationFormResult {
  form: TimerConfigurationFormState;
  fieldErrors: TimerConfigurationFieldErrors;
  formError: string | null;
  isSubmitting: boolean;
  setName: (value: string) => void;
  setRounds: (value: number) => void;
  setRoundMinutes: (value: string) => void;
  setRoundSeconds: (value: string) => void;
  setRestMinutes: (value: string) => void;
  setRestSeconds: (value: string) => void;
  setWarnBeforeEnd: (value: boolean) => void;
  setBellSound: (value: boolean) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

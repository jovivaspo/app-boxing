import type { FormEvent } from "react";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

export interface TimerConfigurationFormProps {
  initialConfiguration: TimerConfiguration | null;
}

export interface TimerConfigurationFormState {
  name: string;
  rounds: number;
  roundMinutes: number;
  roundSeconds: number;
  restMinutes: number;
  restSeconds: number;
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
  setRoundMinutes: (value: number) => void;
  setRoundSeconds: (value: number) => void;
  setRestMinutes: (value: number) => void;
  setRestSeconds: (value: number) => void;
  setWarnBeforeEnd: (value: boolean) => void;
  setBellSound: (value: boolean) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

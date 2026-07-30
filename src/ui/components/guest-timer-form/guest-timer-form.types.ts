import type { FormEvent } from "react";

import type { GuestTimerConfigurationPort } from "@/application/ports/guest-timer-configuration.port";

export interface GuestTimerFormProps {
  localAdapter?: GuestTimerConfigurationPort;
}

export interface GuestTimerFormState {
  rounds: number;
  roundMinutes: number;
  roundSeconds: number;
  restMinutes: number;
  restSeconds: number;
  warnBeforeEnd: boolean;
  bellSound: boolean;
}

export interface UseGuestTimerFormResult {
  form: GuestTimerFormState;
  isStartEnabled: boolean;
  isSubmitting: boolean;
  setRounds: (value: number) => void;
  setRoundMinutes: (value: number) => void;
  setRoundSeconds: (value: number) => void;
  setRestMinutes: (value: number) => void;
  setRestSeconds: (value: number) => void;
  setWarnBeforeEnd: (value: boolean) => void;
  setBellSound: (value: boolean) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

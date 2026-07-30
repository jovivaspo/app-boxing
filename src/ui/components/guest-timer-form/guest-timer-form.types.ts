import type { FormEvent } from "react";

import type { GuestTimerConfigurationPort } from "@/application/ports/guest-timer-configuration.port";

export interface GuestTimerFormProps {
  localAdapter?: GuestTimerConfigurationPort;
}

export interface GuestTimerFormState {
  rounds: number;
  roundMinutes: string;
  roundSeconds: string;
  restMinutes: string;
  restSeconds: string;
  warnBeforeEnd: boolean;
  bellSound: boolean;
}

export interface UseGuestTimerFormResult {
  form: GuestTimerFormState;
  isStartEnabled: boolean;
  isSubmitting: boolean;
  setRounds: (value: number) => void;
  setRoundMinutes: (value: string) => void;
  setRoundSeconds: (value: string) => void;
  setRestMinutes: (value: string) => void;
  setRestSeconds: (value: string) => void;
  setWarnBeforeEnd: (value: boolean) => void;
  setBellSound: (value: boolean) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

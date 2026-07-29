import { validateTimerConfiguration } from "@/domain/errors/timer-configuration-errors";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type {
  GuestTimerConfigurationInput,
  GuestTimerConfigurationPort,
} from "@/application/ports/guest-timer-configuration.port";
import {
  getItem,
  removeItem,
  setItem,
} from "@/infraestructure/storage/localStorage";

const STORAGE_KEY = "guest-timer";
const GUEST_NAME = "Mi Timer";

/**
 * Creates the `GuestTimerConfigurationPort` implementation backed by
 * `localStorage` — used for the guest (no session) path. Single-record
 * strategy (D2): at most one `TimerConfiguration` lives under `STORAGE_KEY`,
 * `id` generated once on first write and reused on every subsequent write
 * (create-overwrites-not-appends), `name` always fixed to `GUEST_NAME`.
 */
export function createLocalTimerConfigurationAdapter(): GuestTimerConfigurationPort {
  return {
    async read(): Promise<TimerConfiguration | null> {
      return getItem<TimerConfiguration>(STORAGE_KEY) ?? null;
    },

    async write(
      config: GuestTimerConfigurationInput
    ): Promise<TimerConfiguration> {
      if (typeof window === "undefined") {
        throw new Error(
          "Cannot write a timer configuration: localStorage is unavailable (SSR)"
        );
      }

      const existing = getItem<TimerConfiguration>(STORAGE_KEY);
      const candidate: TimerConfiguration = {
        ...config,
        id: existing?.id ?? crypto.randomUUID(),
        name: GUEST_NAME,
      };
      const record = validateTimerConfiguration(candidate);
      setItem(STORAGE_KEY, record);
      return record;
    },

    async clear(): Promise<void> {
      removeItem(STORAGE_KEY);
    },
  };
}

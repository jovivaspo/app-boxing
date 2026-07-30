import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

/** Guest write input: `id` and `name` are adapter-owned (D2). */
export type GuestTimerConfigurationInput = Omit<
  TimerConfiguration,
  "id" | "name"
>;

/**
 * Narrow port for the guest (no session) single-record timer storage.
 * Replaces `TimerConfigurationRepositoryPort`'s full CRUD for guests — a
 * guest has at most one stored `TimerConfiguration`.
 */
export interface GuestTimerConfigurationPort {
  /** Resolves the single stored record, or `null` if none exists. Never rejects. */
  read(): Promise<TimerConfiguration | null>;
  /**
   * Persists `config` as the single stored record, overwriting any previous
   * one (never appends). `id` is generated once and reused across writes;
   * `name` is always set to `"Guest timer"`.
   * @throws {import("@/domain/errors/timer-configuration-errors").InvalidTimerConfiguration} rounds, roundDuration, or restDuration is <= 0.
   */
  write(config: GuestTimerConfigurationInput): Promise<TimerConfiguration>;
  /** Removes the single stored record, if any. */
  clear(): Promise<void>;
}

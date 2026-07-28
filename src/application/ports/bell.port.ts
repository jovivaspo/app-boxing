export interface BellPort {
  /** Best-effort. MUST NOT throw or reject. */
  ring(): void;
}

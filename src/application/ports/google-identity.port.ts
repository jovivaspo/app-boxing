export type GsiError = "missing-client-id" | "script-load-failed" | "no-credential";

export interface GoogleIdentityPort {
  load(cfg: {
    clientId: string;
    onCredential: (idToken: string) => void;
    onError: (e: GsiError) => void;
  }): Promise<void>;
  renderButton(container: HTMLElement): void;
}

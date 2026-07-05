import type { GoogleIdentityPort } from "@/application/ports/google-identity.port";

// Google Identity Services — Sign In With Google.
// This global state (`window.google`, `__googleAuthInitDone`) and the
// script-injection logic used to live inline inside the `useGoogleAuth`
// hook. Isolating it here behind `GoogleIdentityPort` makes the hook
// fakeable in tests without touching `window`/`document`.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: {
              credential?: string;
              select_by?: string;
            }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
          prompt: () => void;
        };
      };
    };
    __googleAuthInitDone?: boolean;
  }
}

const SCRIPT_ID = "google-identity-services";
const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

/**
 * Creates the `GoogleIdentityPort` implementation backed by the real GSI
 * `<script>` tag. `load()` injects the script at most once (idempotent),
 * initializes `window.google.accounts.id` on load, and reports failures via
 * `onError` instead of throwing — `script-load-failed` (script `onerror`),
 * `missing-client-id` (empty `clientId`), and `no-credential` (GSI callback
 * without a credential).
 */
export function createGsiLoaderAdapter(): GoogleIdentityPort {
  return {
    load(cfg): Promise<void> {
      if (!cfg.clientId) {
        cfg.onError("missing-client-id");
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        function initClient() {
          if (!window.google || window.__googleAuthInitDone) {
            resolve();
            return;
          }

          window.google.accounts.id.initialize({
            client_id: cfg.clientId,
            callback: (response) => {
              if (!response.credential) {
                cfg.onError("no-credential");
                return;
              }
              cfg.onCredential(response.credential);
            },
          });
          window.__googleAuthInitDone = true;
          resolve();
        }

        if (document.getElementById(SCRIPT_ID)) {
          initClient();
          return;
        }

        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = GSI_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.onload = initClient;
        script.onerror = () => {
          cfg.onError("script-load-failed");
          resolve();
        };
        document.body.appendChild(script);
      });
    },

    renderButton(container: HTMLElement): void {
      if (!window.google) return;
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        width: container.clientWidth,
      });
    },
  };
}

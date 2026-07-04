"use client";

import { useEffect } from "react";

// Google Identity Services — Sign In With Google
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

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_ID = "google-identity-services";

export function useGoogleAuth(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onSuccess: (idToken: string) => void,
  onError: (error: string) => void
) {
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      onError("Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en el entorno.");
      return;
    }

    if (!containerRef.current) return;

    let cancelled = false;

    function loadAndInit() {
      if (document.getElementById(SCRIPT_ID)) {
        initClient();
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initClient;
      script.onerror = () => {
        if (!cancelled) onError("No se pudo cargar el SDK de Google.");
      };
      document.body.appendChild(script);
    }

    function initClient() {
      if (!window.google || cancelled) return;

      // Strict Mode / HMR: evita doble inicialización
      if (window.__googleAuthInitDone) {
        if (containerRef.current) {
          window.google.accounts.id.renderButton(containerRef.current, {
            theme: "outline",
            size: "large",
            width: containerRef.current.clientWidth,
          });
        }
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID!,
        callback: (response) => {
          if (cancelled) return;
          if (!response.credential) {
            onError("Google no devolvió un token válido.");
            return;
          }
          onSuccess(response.credential);
        },
      });

      window.__googleAuthInitDone = true;

      if (containerRef.current) {
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: containerRef.current.clientWidth,
        });
      }
    }

    loadAndInit();

    return () => {
      cancelled = true;
    };
  }, [containerRef, onSuccess, onError]);
}

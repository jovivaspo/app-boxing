"use client";

import { useEffect } from "react";

import type {
  GoogleIdentityPort,
  GsiError,
} from "@/application/ports/google-identity.port";
import { createGsiLoaderAdapter } from "@/infraestructure/auth/gsi-loader.adapter";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

const ERROR_COPY: Record<GsiError, string> = {
  "missing-client-id": "Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en el entorno.",
  "script-load-failed": "No se pudo cargar el SDK de Google.",
  "no-credential": "Google no devolvió un token válido.",
};

const defaultPort: GoogleIdentityPort = createGsiLoaderAdapter();

export function useGoogleAuth(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onSuccess: (idToken: string) => void,
  onError: (error: string) => void,
  port: GoogleIdentityPort = defaultPort
) {
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    port
      .load({
        clientId: GOOGLE_CLIENT_ID,
        onCredential: (idToken) => {
          if (cancelled) return;
          onSuccess(idToken);
        },
        onError: (error) => {
          if (cancelled) return;
          onError(ERROR_COPY[error]);
        },
      })
      .then(() => {
        if (cancelled || !containerRef.current) return;
        port.renderButton(containerRef.current);
      });

    return () => {
      cancelled = true;
    };
  }, [containerRef, onSuccess, onError, port]);
}

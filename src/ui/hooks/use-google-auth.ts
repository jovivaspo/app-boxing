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

// Real adapter as a module-level singleton so the default `port` argument
// keeps a stable identity across renders (a fresh instance on every render
// would retrigger the effect on every render too).
const defaultPort: GoogleIdentityPort = createGsiLoaderAdapter();

/**
 * Thin UI hook: wires the container ref + success/error callbacks to an
 * injected `GoogleIdentityPort` (real GSI adapter by default, fakeable in
 * tests) and maps `GsiError` to Spanish copy. Owns NO `window`/script logic
 * — that lives entirely in `createGsiLoaderAdapter()`.
 */
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

"use client";

import { unstable_rethrow } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import {
  googleLogin,
  type GoogleLoginErrorCode,
} from "@/infraestructure/actions/google-login/google-login.action";
import { useGoogleAuth } from "@/ui/hooks/use-google-auth";

import type { UseLoginCardResult } from "./login-card.types";

const ERROR_CODE_COPY: Record<GoogleLoginErrorCode, string> = {
  "invalid-credentials": "Credenciales inválidas. Intenta de nuevo.",
  "backend-unavailable":
    "No pudimos conectar con el servidor. Intenta más tarde.",
  unknown: "Ocurrió un error al iniciar sesión. Intenta de nuevo.",
};

export function useLoginCard(): UseLoginCardResult {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  const handleSuccess = useCallback(async (idToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await googleLogin(idToken);

      if (result && !result.ok) {
        setError(ERROR_CODE_COPY[result.code]);
        setIsLoading(false);
      }
    } catch (err) {
      unstable_rethrow(err);
      setError(ERROR_CODE_COPY.unknown);
      setIsLoading(false);
    }
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setIsLoading(false);
  }, []);

  useGoogleAuth(buttonContainerRef, handleSuccess, handleError);

  return { error, isLoading, buttonContainerRef };
}

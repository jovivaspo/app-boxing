"use client";

import { useRef, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card"
import { SecurityBadges } from "@/ui/components/security-badges"
import {
  googleLogin,
  type GoogleLoginErrorCode,
} from "@/infraestructure/actions/google-login.action";
import { useGoogleAuth } from "@/ui/hooks/use-google-auth";

const ERROR_CODE_COPY: Record<GoogleLoginErrorCode, string> = {
  "invalid-credentials": "Credenciales inválidas. Intenta de nuevo.",
  "backend-unavailable":
    "No pudimos conectar con el servidor. Intenta más tarde.",
  unknown: "Ocurrió un error al iniciar sesión. Intenta de nuevo.",
};

export function LoginCard() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  const handleSuccess = useCallback(async (idToken: string) => {
    setIsLoading(true);
    setError(null);

    const result = await googleLogin(idToken);

    if (result && !result.ok) {
      setError(ERROR_CODE_COPY[result.code]);
      setIsLoading(false);
    }
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setIsLoading(false);
  }, []);

  useGoogleAuth(buttonContainerRef, handleSuccess, handleError);

  return (
    <Card className="w-full bg-transparent p-4 ring-0 sm:p-6 lg:max-w-[440px] lg:border-border lg:border-l-4 lg:border-l-primary lg:bg-card lg:p-8 lg:ring-1 lg:ring-foreground/10">
      <CardHeader className="p-0">
        <CardTitle className="text-2xl tracking-tight sm:text-3xl">
          IRON PULSE
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Entrena duro, pelea inteligente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-0 pt-6">
        <div ref={buttonContainerRef} className="flex w-full justify-center" />

        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">
            Verificando credenciales…
          </p>
        )}

        {error && (
          <p className="bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="text-center font-mono text-xs tracking-widest text-muted-foreground">
          SISTEMA DE AUTENTICACIÓN SEGURA V1.0
        </p>

        <SecurityBadges />
      </CardContent>
    </Card>
  )
}

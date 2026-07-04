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
import { googleLogin } from "@/app/login/actions";
import { useGoogleAuth } from "@/ui/hooks/use-google-auth";

export function LoginCard() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  const handleSuccess = useCallback(async (idToken: string) => {
    setIsLoading(true);
    setError(null);

    const result = await googleLogin(idToken);

    if (result && !result.success) {
      setError(result.error ?? "Error al iniciar sesión.");
      setIsLoading(false);
    }
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setIsLoading(false);
  }, []);

  useGoogleAuth(buttonContainerRef, handleSuccess, handleError);

  return (
    <Card className="w-full max-w-[440px] rounded-2xl border-border p-4 sm:p-8">
      <CardHeader className="p-0">
        <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Bienvenido
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Inicia sesión en tu cuenta
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
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <SecurityBadges />
      </CardContent>
    </Card>
  )
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/shadcn/card";
import { SecurityBadges } from "@/ui/components/security-badges";

import { useLoginCard } from "./login-card.hook";

export function LoginCard() {
  const { error, isLoading, buttonContainerRef } = useLoginCard();

  return (
    <Card className="lg:border-border lg:border-l-primary lg:bg-card lg:ring-foreground/10 w-full bg-transparent p-4 ring-0 sm:p-6 lg:max-w-[440px] lg:border-l-4 lg:p-8 lg:ring-1">
      <CardHeader className="p-0">
        <CardTitle className="text-2xl tracking-tight sm:text-3xl">
          IRON PULSE
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Entrena duro, pelea inteligente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-0 pt-6">
        <div ref={buttonContainerRef} className="flex w-full justify-center" />

        {isLoading && (
          <p className="text-muted-foreground text-center text-sm">
            Verificando credenciales…
          </p>
        )}

        {error && (
          <p className="bg-destructive/10 text-destructive px-3 py-2 text-center text-sm">
            {error}
          </p>
        )}

        <p className="text-muted-foreground text-center font-mono text-xs tracking-widest">
          SISTEMA DE AUTENTICACIÓN SEGURA V1.0
        </p>

        <SecurityBadges />
      </CardContent>
    </Card>
  );
}

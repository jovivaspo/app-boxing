import Link from "next/link";
import { Timer } from "lucide-react";

import { Button } from "@/ui/components/shadcn/button";

export function LandingHero() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-4 pt-10 sm:px-6 md:items-center md:text-center">
      <div className="border-border bg-card inline-block border px-4 py-2">
        <span className="text-primary font-mono text-xs tracking-widest uppercase">
          Entrenamiento por rounds
        </span>
      </div>

      <h1 className="font-heading text-foreground max-w-4xl text-4xl uppercase italic sm:text-6xl">
        Tu ring. Tu ritmo. Tu round.
      </h1>

      <p className="text-muted-foreground max-w-2xl text-lg">
        Un timer de boxeo configurable y de alto rendimiento. Diseñado para
        boxeadores que necesitan precisión, avisos claros y cero distracciones
        durante el sparring o el trabajo de saco.
      </p>

      <div className="mt-4 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
        <Button
          asChild
          className="font-heading h-16 w-full rounded-none text-lg uppercase italic sm:w-auto"
        >
          <Link href="/guest-timer">
            <Timer className="size-5" aria-hidden="true" />
            Probar el timer
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="font-heading h-16 w-full rounded-none text-lg uppercase italic sm:w-auto"
        >
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>

      <p className="text-muted-foreground mt-2 font-mono text-xs tracking-widest uppercase">
        Sin registro · Empieza en 10 segundos
      </p>
    </section>
  );
}

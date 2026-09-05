"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Lock, ShieldCheck, Timer } from "lucide-react";

import { Button } from "@/ui/components/shadcn/button";
import { useLandingHeroParallax } from "./landing-hero.hook";

const TRUST_BADGES = [
  { icon: BadgeCheck, label: "Verificado" },
  { icon: Lock, label: "Encriptado" },
  { icon: ShieldCheck, label: "Seguro" },
];

export function LandingHero() {
  const { glowRedStyle, glowYellowStyle, backgroundPosition, onMouseMove } =
    useLandingHeroParallax();

  return (
    <section
      id="inicio"
      onMouseMove={onMouseMove}
      className="relative flex min-h-screen flex-col overflow-hidden"
    >
      <Image
        src="/hero-boxing-glove.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        style={{ objectPosition: backgroundPosition }}
        className="object-cover transition-[object-position] duration-200 ease-out"
      />

      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(28,28,28,0.4)_0px,rgba(28,28,28,0.4)_2px,rgba(22,22,22,0.4)_2px,rgba(22,22,22,0.4)_16px)]" />

      <div className="pointer-events-none absolute -top-[10%] -left-[10%] size-[60vw] max-h-[700px] max-w-[700px] animate-[float-glow_8s_ease-in-out_infinite]">
        <div
          style={glowRedStyle}
          className="size-full rounded-full bg-[radial-gradient(circle,rgba(220,0,0,0.35)_0%,rgba(220,0,0,0)_70%)] transition-transform duration-200 ease-out will-change-transform"
        />
      </div>
      <div className="pointer-events-none absolute -right-[10%] -bottom-[15%] size-[55vw] max-h-[650px] max-w-[650px] animate-[float-glow-reverse_10s_ease-in-out_infinite]">
        <div
          style={glowYellowStyle}
          className="size-full rounded-full bg-[radial-gradient(circle,rgba(249,189,34,0.22)_0%,rgba(249,189,34,0)_70%)] transition-transform duration-200 ease-out will-change-transform"
        />
      </div>

      <div className="from-background/55 via-background/70 to-background/95 absolute inset-0 bg-linear-to-b" />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pt-28 pb-16 sm:px-6 lg:px-12">
        <div className="flex w-full max-w-[900px] flex-col items-start gap-6">
          <div className="border-border bg-card/80 inline-block animate-[fade-up_0.8s_ease-out_both] border px-4 py-2">
            <span className="text-primary font-mono text-xs tracking-widest uppercase">
              Entrenamiento por rounds
            </span>
          </div>

          <h1 className="font-heading text-foreground text-4xl leading-[0.94] uppercase italic sm:text-6xl lg:text-7xl">
            <span className="block animate-[slide-in-left_0.7s_ease-out_150ms_both]">
              Tu ring.
            </span>{" "}
            <span className="block animate-[slide-in-left_0.7s_ease-out_350ms_both]">
              Tu ritmo.
            </span>{" "}
            <span className="block animate-[slide-in-left_0.7s_ease-out_550ms_both]">
              Tu round.
            </span>
          </h1>

          <p className="text-muted-foreground max-w-2xl animate-[fade-up_0.8s_ease-out_300ms_both] text-lg">
            Un timer de boxeo configurable y de alto rendimiento. Diseñado para
            boxeadores que necesitan precisión, avisos claros y cero
            distracciones durante el sparring o el trabajo de saco.
          </p>

          <div className="mt-4 flex w-full animate-[fade-up_0.8s_ease-out_450ms_both] flex-col gap-4 sm:w-auto sm:flex-row">
            <Button
              asChild
              className="font-heading h-16 w-full animate-[cta-pulse_2s_ease-in-out_infinite] rounded-none text-lg uppercase italic sm:w-auto"
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

          <p className="text-muted-foreground mt-2 animate-[fade-up_0.8s_ease-out_600ms_both] font-mono text-xs tracking-widest uppercase">
            Sin registro · Empieza en 10 segundos
          </p>

          <ul className="mt-9 flex animate-[fade-up_0.8s_ease-out_750ms_both] flex-wrap gap-5">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

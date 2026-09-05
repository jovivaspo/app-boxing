"use client";

import {
  SlidersHorizontal,
  BellRing,
  Save,
  type LucideIcon,
} from "lucide-react";

import { useScrollReveal } from "@/ui/hooks/use-scroll-reveal";

import { useTiltCard } from "./landing-benefits.hook";

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: SlidersHorizontal,
    title: "Rounds a tu medida",
    description:
      "Defines la cantidad de rounds, la duración de cada uno y el tiempo exacto de descanso. Adaptable a cualquier disciplina de combate.",
  },
  {
    icon: BellRing,
    title: "Campana y avisos",
    description:
      "Sonidos de campana claros para inicio y fin de round, más un aviso de 10 segundos antes de cerrar para apretar el ritmo.",
  },
  {
    icon: Save,
    title: "Guarda tus timers",
    description:
      "Inicia sesión con Google para guardar rutinas de 3, 5 o 12 rounds y accede a ellas desde cualquier dispositivo al instante.",
  },
];

export function LandingBenefits() {
  const [sectionRef, isVisible] = useScrollReveal<HTMLElement>();
  const firstCardTilt = useTiltCard();
  const secondCardTilt = useTiltCard();
  const thirdCardTilt = useTiltCard();
  const cardTilts = [firstCardTilt, secondCardTilt, thirdCardTilt];

  return (
    <section
      id="beneficios"
      ref={sectionRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
      }}
      className="border-border mx-auto mt-10 w-full max-w-5xl border-t px-4 pt-16 transition-[opacity,transform] duration-700 ease-out sm:px-6 sm:pt-24"
    >
      <h2 className="font-heading text-foreground mb-10 text-center text-2xl uppercase italic sm:text-4xl">
        Por qué Iron Pulse
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, description }, index) => {
          const tilt = cardTilts[index];
          return (
            <div
              key={title}
              onMouseMove={tilt.onMouseMove}
              onMouseLeave={tilt.onMouseLeave}
              style={{ ...tilt.style, transformStyle: "preserve-3d" }}
              className="bg-card border-border border-l-primary relative flex flex-col gap-4 border border-l-4 p-6 transition-transform duration-300 ease-out"
            >
              <Icon className="text-foreground size-8" aria-hidden="true" />
              <h3 className="font-heading text-foreground text-xl uppercase">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

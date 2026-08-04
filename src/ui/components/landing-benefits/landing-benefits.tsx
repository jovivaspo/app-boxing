import {
  SlidersHorizontal,
  BellRing,
  Save,
  type LucideIcon,
} from "lucide-react";

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
      "Definís la cantidad de rounds, duración de cada uno y tiempo exacto de descanso. Adaptable a cualquier disciplina de combate.",
  },
  {
    icon: BellRing,
    title: "Campana y avisos",
    description:
      "Sonidos de campana claros para inicio y fin de round, más un aviso de 10 segundos antes de cerrar para apretar el ritmo.",
  },
  {
    icon: Save,
    title: "Guardá tus timers",
    description:
      "Iniciá sesión con Google para guardar rutinas de 3, 5 o 12 rounds y accedé a ellas desde cualquier dispositivo al instante.",
  },
];

/**
 * Landing benefit block (`landing-page` capability) — exactly three items
 * from a local const array, per design D-6. Presentational, session-agnostic.
 */
export function LandingBenefits() {
  return (
    <section className="border-border mx-auto mt-10 w-full max-w-5xl border-t px-4 pt-10 sm:px-6">
      <h2 className="font-heading text-foreground mb-10 text-2xl uppercase italic md:text-center">
        Por qué Iron Pulse
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="bg-card border-border border-l-primary relative flex flex-col gap-4 border border-l-4 p-6"
          >
            <Icon className="text-foreground size-8" />
            <h3 className="font-heading text-foreground text-xl uppercase">
              {title}
            </h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

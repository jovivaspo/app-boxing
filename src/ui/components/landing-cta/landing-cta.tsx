import Link from "next/link";
import { Play } from "lucide-react";

import { Button } from "@/ui/components/shadcn/button";

export function LandingCta() {
  return (
    <section className="bg-card border-border mt-10 flex w-full flex-col items-center gap-6 border-y px-4 py-10 text-center sm:px-6">
      <h2 className="font-heading text-foreground text-4xl uppercase italic sm:text-5xl">
        Suena la campana
      </h2>
      <Button
        asChild
        className="font-heading h-16 w-full max-w-md rounded-none text-lg uppercase italic"
      >
        <Link href="/guest-timer">
          <Play className="size-5" aria-hidden="true" />
          Probar el timer
        </Link>
      </Button>
    </section>
  );
}

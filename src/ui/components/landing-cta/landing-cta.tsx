"use client";

import Link from "next/link";
import { Play } from "lucide-react";

import { Button } from "@/ui/components/shadcn/button";
import { useScrollReveal } from "@/ui/hooks/use-scroll-reveal";

export function LandingCta() {
  const [sectionRef, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section
      id="el-timer"
      ref={sectionRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
      }}
      className="bg-card border-border relative mt-10 overflow-hidden border-y px-4 py-20 text-center transition-[opacity,transform] duration-700 ease-out sm:px-6 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(220,0,0,0.06)_0px,rgba(220,0,0,0.06)_2px,transparent_2px,transparent_18px)]" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-7">
        <h2 className="font-heading text-foreground text-4xl uppercase italic sm:text-5xl">
          Suena la campana
        </h2>
        <Button
          asChild
          className="font-heading h-16 w-full max-w-md animate-[cta-pulse_2s_ease-in-out_infinite] rounded-none text-lg uppercase italic"
        >
          <Link href="/guest-timer">
            <Play className="size-5" aria-hidden="true" />
            Probar el timer
          </Link>
        </Button>
      </div>
    </section>
  );
}

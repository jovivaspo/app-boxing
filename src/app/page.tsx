import type { Metadata } from "next";

import { siteUrl } from "@/infraestructure/config/site-url";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { Topbar } from "@/ui/components/topbar";
import { Footer } from "@/ui/components/footer";
import { LandingHero } from "@/ui/components/landing-hero";
import { LandingBenefits } from "@/ui/components/landing-benefits";
import { LandingCta } from "@/ui/components/landing-cta";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Iron Pulse — Timer de boxeo por rounds",
  description:
    "Timer de boxeo configurable y de alto rendimiento. Rounds, descansos y avisos a tu medida. Sin registro, empieza en 10 segundos.",
  openGraph: {
    title: "Iron Pulse — Timer de boxeo por rounds",
    description:
      "Timer de boxeo configurable y de alto rendimiento. Rounds, descansos y avisos a tu medida.",
    url: "/",
    images: ["/logo-iron-pulse.png"],
  },
  twitter: {
    card: "summary",
    title: "Iron Pulse — Timer de boxeo por rounds",
    description:
      "Timer de boxeo configurable y de alto rendimiento. Rounds, descansos y avisos a tu medida.",
    images: ["/logo-iron-pulse.png"],
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Topbar session={session} />
      <main className="flex flex-1 flex-col">
        <LandingHero />
        <LandingBenefits />
        <LandingCta />
      </main>
      <Footer />
    </div>
  );
}

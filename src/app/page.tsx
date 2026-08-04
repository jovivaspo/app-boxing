import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { Topbar } from "@/ui/components/topbar";
import { Footer } from "@/ui/components/footer";
import { LandingHero } from "@/ui/components/landing-hero";
import { LandingBenefits } from "@/ui/components/landing-benefits";
import { LandingCta } from "@/ui/components/landing-cta";

// `/` is a public landing (D-1, `landing-page` capability): it never
// redirects on session state. The session read only drives the Topbar's
// session-aware state, so `force-dynamic` stays for the same reason as
// `/login` — the adapter can fail closed to `null` BEFORE touching
// `cookies()`, which would otherwise let Next.js's build-time analysis miss
// the dynamic-API usage and bake this into a static page.
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

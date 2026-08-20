import { redirect } from "next/navigation";

import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { LoginCard } from "@/ui/components/login-card";
import { Topbar } from "@/ui/components/topbar";
import { Footer } from "@/ui/components/footer";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  if (session) {
    redirect("/timers");
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Topbar session={null} />
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <LoginCard />
      </main>
      <Footer />
    </div>
  );
}

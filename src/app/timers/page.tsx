import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { TimerConfigurationList } from "@/ui/components/timer-configuration-list";

// See src/app/page.tsx for why session-gated routes must force dynamic
// rendering rather than rely on Next.js's build-time dynamic-API detection.
// This route is NOT session-gated (guest access is intentional), but it
// still resolves the session to decide auth vs. guest, so the same
// dynamic-rendering rule applies.
export const dynamic = "force-dynamic";

export default async function TimersPage() {
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mis Timers</h1>
      <TimerConfigurationList isAuthenticated={session !== null} />
    </main>
  );
}

import { redirect } from "next/navigation";

import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { TimerConfigurationForm } from "@/ui/components/timer-configuration-form";

export const dynamic = "force-dynamic";

export default async function NewTimerPage() {
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo Timer</h1>
      <TimerConfigurationForm initialConfiguration={null} />
    </main>
  );
}

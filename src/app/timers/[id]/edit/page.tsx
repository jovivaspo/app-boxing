import { notFound, redirect } from "next/navigation";

import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { getTimerConfiguration } from "@/application/use-cases/get-timer-configuration/get-timer-configuration";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { TimerConfigurationForm } from "@/ui/components/timer-configuration-form";

// See src/app/login/page.tsx for why session-gated routes must force dynamic
// rendering rather than rely on Next.js's build-time dynamic-API detection.
export const dynamic = "force-dynamic";

type EditTimerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTimerPage(props: EditTimerPageProps) {
  // Next.js 16: `params` is a Promise.
  const { id } = await props.params;
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  if (!session) {
    redirect("/login");
  }

  let initialConfiguration;
  try {
    initialConfiguration = await getTimerConfiguration({
      repository: createBackendTimerConfigurationAdapter(session.token),
    })(id);
  } catch (error) {
    if (toTimerConfigurationErrorCode(error) === "not-found") {
      notFound();
    }
    throw error;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Editar Timer</h1>
      <TimerConfigurationForm initialConfiguration={initialConfiguration} />
    </main>
  );
}

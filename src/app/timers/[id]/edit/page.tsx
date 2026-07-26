import { notFound } from "next/navigation";

import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { getTimerConfiguration } from "@/application/use-cases/get-timer-configuration/get-timer-configuration";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { TimerConfigurationForm } from "@/ui/components/timer-configuration-form";

// See src/app/page.tsx for why session-gated routes must force dynamic
// rendering rather than rely on Next.js's build-time dynamic-API detection.
// This route is NOT session-gated (guest access is intentional), but it
// still resolves the session to decide auth vs. guest, so the same
// dynamic-rendering rule applies.
export const dynamic = "force-dynamic";

type EditTimerPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditTimerPage(props: EditTimerPageProps) {
  // Next.js 16: `params` is a Promise.
  const { id } = await props.params;
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  if (!session) {
    // D3: guest editing has no server-side lookup available (localStorage is
    // unreachable server-side) — the form hook resolves the record
    // client-side over the injected local adapter.
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-4">
        <h1 className="text-2xl font-semibold tracking-tight">Editar Timer</h1>
        <TimerConfigurationForm
          isAuthenticated={false}
          initialConfiguration={null}
          timerId={id}
        />
      </main>
    );
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
      <TimerConfigurationForm
        isAuthenticated
        initialConfiguration={initialConfiguration}
      />
    </main>
  );
}

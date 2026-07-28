import { notFound } from "next/navigation";

import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { getTimerConfiguration } from "@/application/use-cases/get-timer-configuration/get-timer-configuration";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { TimerActive } from "@/ui/components/timer-active";

// See src/app/page.tsx for why session-gated routes must force dynamic
// rendering rather than rely on Next.js's build-time dynamic-API detection.
// This route is NOT session-gated (guest access is intentional), but it
// still resolves the session to decide auth vs. guest, so the same
// dynamic-rendering rule applies.
export const dynamic = "force-dynamic";

type ActiveTimerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ActiveTimerPage(props: ActiveTimerPageProps) {
  // Next.js 16: `params` is a Promise.
  const { id } = await props.params;
  const session = await getCurrentSession({
    session: createCookieSessionAdapter(),
  })();

  if (!session) {
    // D14/route section: guest identities resolve the configuration
    // client-side over the injected local adapter — no server-side lookup.
    return (
      <TimerActive
        isAuthenticated={false}
        initialConfiguration={null}
        timerId={id}
      />
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
    <TimerActive isAuthenticated initialConfiguration={initialConfiguration} />
  );
}

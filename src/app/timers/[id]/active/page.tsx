import { notFound, redirect } from "next/navigation";

import { createCookieSessionAdapter } from "@/infraestructure/session/cookie-session.adapter";
import { getCurrentSession } from "@/application/use-cases/get-current-session/get-current-session";
import { getTimerConfiguration } from "@/application/use-cases/get-timer-configuration/get-timer-configuration";
import { toTimerConfigurationErrorCode } from "@/application/timer-configuration/timer-configuration-result";
import { createBackendTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/backend-timer-configuration.adapter";
import { TimerActive } from "@/ui/components/timer-active";

export const dynamic = "force-dynamic";

type ActiveTimerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ActiveTimerPage(props: ActiveTimerPageProps) {
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

  return <TimerActive initialConfiguration={initialConfiguration} />;
}

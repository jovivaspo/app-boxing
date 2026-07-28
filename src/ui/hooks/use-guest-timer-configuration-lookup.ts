"use client";

import { useEffect, useRef, useState } from "react";
import type { useRouter } from "next/navigation";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import { getTimerConfiguration } from "@/application/use-cases/get-timer-configuration/get-timer-configuration";

export interface GuestTimerConfigurationLookupResult {
  config: TimerConfiguration | null;
  notFound: boolean;
}

// D3: no server-side guest lookup is possible since localStorage is
// unreachable server-side, so the record is resolved client-side over the
// injected local adapter. Shared by the form and Timer Activo hooks so the
// guest not-found handling (redirect + logging) has a single implementation.
export function useGuestTimerConfigurationLookup(
  isAuthenticated: boolean,
  timerId: string | undefined,
  initialConfiguration: TimerConfiguration | null,
  localAdapter: TimerConfigurationRepositoryPort,
  router: ReturnType<typeof useRouter>,
  onResolved?: (config: TimerConfiguration) => void
): GuestTimerConfigurationLookupResult {
  const [config, setConfig] = useState<TimerConfiguration | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Latest-callback ref: `onResolved` is invoked from inside the fetch's own
  // `.then()` (an external-system callback, not a value-change reaction), so
  // it never needs to sit in the effect's dependency array.
  const onResolvedRef = useRef(onResolved);
  useEffect(() => {
    onResolvedRef.current = onResolved;
  });

  useEffect(() => {
    if (isAuthenticated || !timerId || initialConfiguration) return;

    let cancelled = false;
    getTimerConfiguration({ repository: localAdapter })(timerId)
      .then((resolved) => {
        if (!cancelled) {
          setConfig(resolved);
          onResolvedRef.current?.(resolved);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Guest timer configuration lookup failed", error);
          setNotFound(true);
          router.replace("/timers");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, timerId, initialConfiguration, localAdapter, router]);

  return { config, notFound };
}

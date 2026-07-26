"use client";

import { useCallback, useEffect, useState } from "react";

import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import { useTimerConfigurations } from "@/ui/hooks/use-timer-configurations";

interface UseTimerConfigurationListResult {
  configurations: TimerConfiguration[];
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  remove: (id: string) => void;
}

const DELETE_ERROR = "No se pudo eliminar el timer. Intentá de nuevo.";

/** Owns all list-screen logic (A2): load on mount, empty state, optimistic delete. */
export function useTimerConfigurationList(
  isAuthenticated: boolean
): UseTimerConfigurationListResult {
  const [configurations, setConfigurations] = useState<TimerConfiguration[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ops = useTimerConfigurations(isAuthenticated);

  useEffect(() => {
    let cancelled = false;

    ops.list().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setConfigurations(result.data);
      } else {
        setError(DELETE_ERROR);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [ops]);

  const remove = useCallback(
    (id: string) => {
      setError(null);
      setConfigurations((current) => {
        const removed = current.find((config) => config.id === id);
        if (!removed) return current;

        ops.remove(id).then((result) => {
          if (result.ok) return;
          setConfigurations((restored) => [...restored, removed]);
          setError(DELETE_ERROR);
        });

        return current.filter((config) => config.id !== id);
      });
    },
    [ops]
  );

  return {
    configurations,
    isLoading,
    isEmpty: !isLoading && configurations.length === 0,
    error,
    remove,
  };
}

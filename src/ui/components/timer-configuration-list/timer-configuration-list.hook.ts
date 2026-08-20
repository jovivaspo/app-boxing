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

const LOAD_ERROR = "No se pudieron cargar los timers. Intentá de nuevo.";
const DELETE_ERROR = "No se pudo eliminar el timer. Intentá de nuevo.";

export function useTimerConfigurationList(): UseTimerConfigurationListResult {
  const [configurations, setConfigurations] = useState<TimerConfiguration[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ops = useTimerConfigurations();

  useEffect(() => {
    let cancelled = false;

    ops.list().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setConfigurations(result.data);
      } else {
        setError(LOAD_ERROR);
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
      const index = configurations.findIndex((config) => config.id === id);
      if (index === -1) return;
      const removed = configurations[index];

      setConfigurations((current) =>
        current.filter((config) => config.id !== id)
      );

      ops.remove(id).then((result) => {
        if (result.ok) return;
        setConfigurations((current) => {
          const restored = [...current];
          restored.splice(index, 0, removed);
          return restored;
        });
        setError(DELETE_ERROR);
      });
    },
    [ops, configurations]
  );

  return {
    configurations,
    isLoading,
    isEmpty: !isLoading && !error && configurations.length === 0,
    error,
    remove,
  };
}

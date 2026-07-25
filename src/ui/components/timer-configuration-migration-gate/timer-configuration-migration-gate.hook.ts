"use client";

import { useEffect, useState } from "react";

import type { TimerConfigurationRepositoryPort } from "@/application/ports/timer-configuration-repository.port";
import { migrateTimerConfigurations } from "@/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action";
import { createLocalTimerConfigurationAdapter } from "@/infraestructure/timer-configuration/local-timer-configuration.adapter";

import type { UseTimerConfigurationMigrationResult } from "./timer-configuration-migration-gate.types";

// A1: browser-only, non-serializable adapter constructed at module scope so
// it can only run client-side. Exposed as an overridable parameter below so
// tests (and any future caller) can inject a fake at the port boundary.
const defaultLocalAdapter = createLocalTimerConfigurationAdapter();

// ponytail: no fallback lock for browsers without the Web Locks API
// (Chrome 69+, Firefox 96+, Safari 15.4+) — out of this project's target
// browser matrix.
const LOCK_NAME = "timer-configurations-migrating";

/**
 * Migrates every guest localStorage `TimerConfiguration` to the backend on
 * mount (A2: the Server Action call lives here, never in the presentational
 * `.tsx`). Deletes locally only the ids the backend accepted; failed items
 * are left untouched for a future login attempt. `isMigrating` stays `true`
 * until every item has resolved, so the gate can withhold rendering until
 * then (blocking render, silent operation — no user-visible feedback).
 *
 * Guarded by the native Web Locks API (`navigator.locks.request`) so a
 * same-tab double invocation (React Strict Mode) or a concurrent tab never
 * both run the migration and create duplicate backend records. Unlike a
 * hand-rolled localStorage flag, this gives real atomic cross-tab mutual
 * exclusion: a losing invocation genuinely WAITS for the winner's callback
 * to finish (no TOCTOU, no manual release, no TTL) before running its own
 * callback — at which point it lists again, finds nothing left (already
 * deleted by the winner), and settles quickly. Any rejection (lock API,
 * network drop, RPC failure, or the action itself) still resolves
 * `isMigrating` to `false` so the page is never blocked from rendering.
 */
export function useTimerConfigurationMigration(
  localAdapter: TimerConfigurationRepositoryPort = defaultLocalAdapter
): UseTimerConfigurationMigrationResult {
  const [isMigrating, setIsMigrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function migrate() {
      try {
        await navigator.locks.request(LOCK_NAME, async () => {
          const configs = await localAdapter.list();
          if (configs.length === 0) {
            return;
          }

          const results = await migrateTimerConfigurations(configs);
          await Promise.all(
            results
              .filter((result) => result.status === "migrated")
              .map((result) => localAdapter.delete(result.id).catch(() => {}))
          );
        });
      } catch {
        // Never let a rejection here (lock API, RPC failure, network drop,
        // version skew) leave isMigrating stuck at true — the page must
        // still render.
      } finally {
        if (!cancelled) setIsMigrating(false);
      }
    }

    migrate();

    return () => {
      cancelled = true;
    };
  }, [localAdapter]);

  return { isMigrating };
}

// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";

const migrateTimerConfigurationsMock = vi.fn();

vi.mock(
  "@/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action",
  () => ({
    migrateTimerConfigurations: (configs: unknown) =>
      migrateTimerConfigurationsMock(configs),
  })
);

import { useTimerConfigurationMigration } from "../timer-configuration-migration-gate.hook";

// Minimal stub of the native Web Locks API: queues `request()` calls by lock
// name so a second call's callback only runs after the first's settles
// (resolved or rejected) — real mutual exclusion, not a premature bail-out.
function createNavigatorLocksStub() {
  const queues = new Map<string, Promise<unknown>>();
  const request = vi.fn((name: string, callback: () => Promise<unknown>) => {
    const previous = queues.get(name) ?? Promise.resolve();
    const settled = previous.then(callback, callback);
    queues.set(
      name,
      settled.then(
        () => undefined,
        () => undefined
      )
    );
    return settled;
  });
  return { request };
}

describe("useTimerConfigurationMigration", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "locks", {
      value: createNavigatorLocksStub(),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should settle immediately without calling migrateTimerConfigurations when there are no local configurations", async () => {
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() =>
      useTimerConfigurationMigration(localAdapter)
    );

    await waitFor(() => expect(result.current.isMigrating).toBe(false));

    expect(migrateTimerConfigurationsMock).not.toHaveBeenCalled();
  });

  it("should call migrateTimerConfigurations with the local list and delete only migrated ids", async () => {
    const configs = [
      buildTimerConfiguration({ id: "migrated-1" }),
      buildTimerConfiguration({ id: "failed-1" }),
    ];
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue(configs),
      delete: deleteMock,
    });
    migrateTimerConfigurationsMock.mockResolvedValue([
      { id: "migrated-1", status: "migrated" },
      { id: "failed-1", status: "failed" },
    ]);

    const { result } = renderHook(() =>
      useTimerConfigurationMigration(localAdapter)
    );

    await waitFor(() => expect(result.current.isMigrating).toBe(false));

    expect(migrateTimerConfigurationsMock).toHaveBeenCalledWith(configs);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith("migrated-1");
  });

  it("should swallow a delete rejection for a migrated item and still settle", async () => {
    const configs = [buildTimerConfiguration({ id: "migrated-1" })];
    const deleteMock = vi.fn().mockRejectedValue(new Error("delete failed"));
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue(configs),
      delete: deleteMock,
    });
    migrateTimerConfigurationsMock.mockResolvedValue([
      { id: "migrated-1", status: "migrated" },
    ]);

    const { result } = renderHook(() =>
      useTimerConfigurationMigration(localAdapter)
    );

    await waitFor(() => expect(result.current.isMigrating).toBe(false));

    expect(deleteMock).toHaveBeenCalledWith("migrated-1");
  });

  it("should make a losing invocation genuinely wait for the winner before finding nothing left to migrate", async () => {
    let resolveList!: (configs: TimerConfiguration[]) => void;
    const configs = [buildTimerConfiguration({ id: "tc-1" })];
    const listMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<TimerConfiguration[]>((resolve) => {
            resolveList = resolve;
          })
      )
      .mockImplementationOnce(() => Promise.resolve([]));
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: listMock,
    });
    migrateTimerConfigurationsMock.mockResolvedValue([
      { id: "tc-1", status: "migrated" },
    ]);

    const first = renderHook(() =>
      useTimerConfigurationMigration(localAdapter)
    );
    const second = renderHook(() =>
      useTimerConfigurationMigration(localAdapter)
    );

    // Give the losing invocation a chance to run prematurely, if it doesn't
    // really wait on the lock.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(second.result.current.isMigrating).toBe(true);

    resolveList(configs);

    await waitFor(() => expect(first.result.current.isMigrating).toBe(false));
    await waitFor(() => expect(second.result.current.isMigrating).toBe(false));

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(migrateTimerConfigurationsMock).toHaveBeenCalledTimes(1);
  });

  it("should settle isMigrating to false when migrateTimerConfigurations rejects outright", async () => {
    const configs = [buildTimerConfiguration({ id: "tc-1" })];
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue(configs),
    });
    migrateTimerConfigurationsMock.mockRejectedValue(new Error("RPC failure"));

    const { result } = renderHook(() =>
      useTimerConfigurationMigration(localAdapter)
    );

    await waitFor(() => expect(result.current.isMigrating).toBe(false));
  });

  it("should report isMigrating as true synchronously before resolution", () => {
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue([buildTimerConfiguration()]),
    });
    migrateTimerConfigurationsMock.mockResolvedValue([
      { id: "tc-1", status: "migrated" },
    ]);

    const { result } = renderHook(() =>
      useTimerConfigurationMigration(localAdapter)
    );

    expect(result.current.isMigrating).toBe(true);
  });
});

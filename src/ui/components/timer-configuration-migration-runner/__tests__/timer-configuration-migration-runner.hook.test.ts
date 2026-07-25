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

import { useTimerConfigurationMigration } from "../timer-configuration-migration-runner.hook";

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

// The hook no longer exposes any render-gating state (R1) — it returns
// `void` and only runs the migration as a side effect. Assertions below
// observe the mocked collaborators (list/migrate/delete calls) instead of
// a status flag.
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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
    const listMock = vi.fn().mockResolvedValue([]);
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: listMock,
    });

    renderHook(() => useTimerConfigurationMigration(localAdapter));

    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    await flushMicrotasks();

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

    renderHook(() => useTimerConfigurationMigration(localAdapter));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledTimes(1));

    expect(migrateTimerConfigurationsMock).toHaveBeenCalledWith(configs);
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

    renderHook(() => useTimerConfigurationMigration(localAdapter));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("migrated-1"));
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

    renderHook(() => useTimerConfigurationMigration(localAdapter));
    renderHook(() => useTimerConfigurationMigration(localAdapter));

    // Give the losing invocation a chance to run prematurely, if it doesn't
    // really wait on the lock.
    await flushMicrotasks();

    expect(listMock).toHaveBeenCalledTimes(1);

    resolveList(configs);

    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect(migrateTimerConfigurationsMock).toHaveBeenCalledTimes(1);
  });

  it("should never throw when migrateTimerConfigurations rejects outright", async () => {
    const configs = [buildTimerConfiguration({ id: "tc-1" })];
    const localAdapter = makeTimerConfigurationRepositoryPort({
      list: vi.fn().mockResolvedValue(configs),
    });
    migrateTimerConfigurationsMock.mockRejectedValue(new Error("RPC failure"));

    expect(() =>
      renderHook(() => useTimerConfigurationMigration(localAdapter))
    ).not.toThrow();

    await waitFor(() =>
      expect(migrateTimerConfigurationsMock).toHaveBeenCalledWith(configs)
    );
    await flushMicrotasks();
  });
});

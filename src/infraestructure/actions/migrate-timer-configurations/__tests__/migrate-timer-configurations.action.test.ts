import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import type { TimerConfiguration } from "@/domain/timer-configuration/timer-configuration.model";

const getMock = vi.fn();
const createCookieSessionAdapterMock = vi.fn(() => ({ get: getMock }));

const createBackendTimerConfigurationAdapterMock = vi.fn();

const executeMock = vi.fn();
const createTimerConfigurationMock = vi.fn<
  (deps: unknown) => typeof executeMock
>(() => executeMock);

vi.mock("@/infraestructure/session/cookie-session.adapter", () => ({
  createCookieSessionAdapter: () => createCookieSessionAdapterMock(),
}));

vi.mock(
  "@/infraestructure/timer-configuration/backend-timer-configuration.adapter",
  () => ({
    createBackendTimerConfigurationAdapter: (token: string) =>
      createBackendTimerConfigurationAdapterMock(token),
  })
);

vi.mock(
  "@/application/use-cases/create-timer-configuration/create-timer-configuration",
  () => ({
    createTimerConfiguration: (deps: unknown) =>
      createTimerConfigurationMock(deps),
  })
);

describe("migrateTimerConfigurations", () => {
  beforeEach(() => {
    getMock.mockReset();
    createCookieSessionAdapterMock.mockClear();
    createBackendTimerConfigurationAdapterMock.mockReset();
    createTimerConfigurationMock.mockClear();
    executeMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve every item as failed without throwing when no session exists", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue(null);
    const configs = [
      buildTimerConfiguration({ id: "local-1" }),
      buildTimerConfiguration({ id: "local-2" }),
    ];

    const result = await migrateTimerConfigurations(configs);

    expect(result).toEqual([
      { id: "local-1", status: "failed" },
      { id: "local-2", status: "failed" },
    ]);
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
  });

  it("should resolve every item as failed without throwing when BACKEND_URL is not configured", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockImplementation(() => {
      throw new Error("BACKEND_URL is not configured");
    });
    const configs = [buildTimerConfiguration({ id: "local-1" })];

    const result = await migrateTimerConfigurations(configs);

    expect(result).toEqual([{ id: "local-1", status: "failed" }]);
  });

  it("should resolve each item independently, echoing the local id per outcome", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockImplementation(async (candidate: { name: string }) => {
      if (candidate.name === "will-fail") {
        throw new Error("backend rejected");
      }
      return buildTimerConfiguration({ id: "backend-generated-id" });
    });
    const configs = [
      buildTimerConfiguration({ id: "local-success", name: "will-succeed" }),
      buildTimerConfiguration({ id: "local-failure", name: "will-fail" }),
    ];

    const result = await migrateTimerConfigurations(configs);

    expect(result).toEqual([
      { id: "local-success", status: "migrated" },
      { id: "local-failure", status: "failed" },
    ]);
  });

  it("should strip the local id from the candidate passed to createTimerConfiguration", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockResolvedValue(
      buildTimerConfiguration({ id: "backend-generated-id" })
    );
    const config = buildTimerConfiguration({ id: "local-1" });

    await migrateTimerConfigurations([config]);

    expect(executeMock).toHaveBeenCalledWith({
      name: config.name,
      rounds: config.rounds,
      roundDuration: config.roundDuration,
      restDuration: config.restDuration,
      warnBeforeEnd: config.warnBeforeEnd,
      bellSound: config.bellSound,
    });
  });

  it("should resolve a malformed config entry as failed instead of throwing", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockResolvedValue(
      buildTimerConfiguration({ id: "backend-generated-id" })
    );
    const malformed = null as unknown as TimerConfiguration;

    const result = await migrateTimerConfigurations([malformed]);

    expect(result).toEqual([{ id: undefined, status: "failed" }]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("should resolve a malformed config entry hitting the no-session path as failed instead of throwing", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue(null);
    const malformed = null as unknown as TimerConfiguration;

    const result = await migrateTimerConfigurations([malformed]);

    expect(result).toEqual([{ id: undefined, status: "failed" }]);
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
  });

  it("should resolve to an empty array without calling the adapter or use case when given no items", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });

    const result = await migrateTimerConfigurations([]);

    expect(result).toEqual([]);
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("should resolve every item as failed without any session or backend call when the batch exceeds the cap", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    const configs = Array.from({ length: 51 }, (_, index) =>
      buildTimerConfiguration({ id: `local-${index}` })
    );

    const result = await migrateTimerConfigurations(configs);

    expect(result).toEqual(
      configs.map((config) => ({ id: config.id, status: "failed" }))
    );
    expect(getMock).not.toHaveBeenCalled();
    expect(createCookieSessionAdapterMock).not.toHaveBeenCalled();
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("should resolve to an empty array without throwing when configs is not an array", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    const notAnArray = { length: 1, 0: buildTimerConfiguration() } as unknown;

    const result = await migrateTimerConfigurations(
      notAnArray as TimerConfiguration[]
    );

    expect(result).toEqual([]);
    expect(createCookieSessionAdapterMock).not.toHaveBeenCalled();
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
  });

  it("should resolve a shape-invalid item as failed while still migrating its valid siblings", async () => {
    const { migrateTimerConfigurations } =
      await import("../migrate-timer-configurations.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockResolvedValue(
      buildTimerConfiguration({ id: "backend-generated-id" })
    );
    const malformed = {
      ...buildTimerConfiguration({ id: "local-malformed" }),
      rounds: undefined,
    } as unknown as TimerConfiguration;
    const valid = buildTimerConfiguration({ id: "local-valid" });

    const result = await migrateTimerConfigurations([malformed, valid]);

    expect(result).toEqual([
      { id: "local-malformed", status: "failed" },
      { id: "local-valid", status: "migrated" },
    ]);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });
});

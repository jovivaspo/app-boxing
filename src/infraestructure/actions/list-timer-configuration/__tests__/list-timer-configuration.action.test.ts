import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";

const getMock = vi.fn();
const createCookieSessionAdapterMock = vi.fn(() => ({ get: getMock }));

const createBackendTimerConfigurationAdapterMock = vi.fn();

const executeMock = vi.fn();
const listTimerConfigurationsMock = vi.fn<
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
  "@/application/use-cases/list-timer-configuration/list-timer-configuration",
  () => ({
    listTimerConfigurations: (deps: unknown) =>
      listTimerConfigurationsMock(deps),
  })
);

describe("listTimerConfigurationsAction", () => {
  beforeEach(() => {
    getMock.mockReset();
    createCookieSessionAdapterMock.mockClear();
    createBackendTimerConfigurationAdapterMock.mockReset();
    listTimerConfigurationsMock.mockClear();
    executeMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return unauthenticated with no session, without constructing the backend adapter", async () => {
    const { listTimerConfigurationsAction } =
      await import("../list-timer-configuration.action");
    getMock.mockResolvedValue(null);

    const result = await listTimerConfigurationsAction();

    expect(result).toEqual({ ok: false, code: "unauthenticated" });
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
  });

  it("should return unknown when the adapter factory throws", async () => {
    const { listTimerConfigurationsAction } =
      await import("../list-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockImplementation(() => {
      throw new Error("BACKEND_URL is not configured");
    });

    const result = await listTimerConfigurationsAction();

    expect(result).toEqual({ ok: false, code: "unknown" });
  });

  it("should return ok:true with the list on success", async () => {
    const { listTimerConfigurationsAction } =
      await import("../list-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    const configs = [buildTimerConfiguration()];
    executeMock.mockResolvedValue(configs);

    const result = await listTimerConfigurationsAction();

    expect(result).toEqual({ ok: true, data: configs });
  });

  it("should never throw, resolving a Result even when the use case rejects", async () => {
    const { listTimerConfigurationsAction } =
      await import("../list-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockRejectedValue(new Error("network error"));

    const result = await listTimerConfigurationsAction();

    expect(result).toEqual({ ok: false, code: "unknown" });
  });
});

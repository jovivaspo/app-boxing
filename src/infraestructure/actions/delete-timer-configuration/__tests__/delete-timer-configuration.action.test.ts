import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";

const getMock = vi.fn();
const createCookieSessionAdapterMock = vi.fn(() => ({ get: getMock }));

const createBackendTimerConfigurationAdapterMock = vi.fn();

const executeMock = vi.fn();
const deleteTimerConfigurationMock = vi.fn<
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
  "@/application/use-cases/delete-timer-configuration/delete-timer-configuration",
  () => ({
    deleteTimerConfiguration: (deps: unknown) =>
      deleteTimerConfigurationMock(deps),
  })
);

describe("deleteTimerConfigurationAction", () => {
  beforeEach(() => {
    getMock.mockReset();
    createCookieSessionAdapterMock.mockClear();
    createBackendTimerConfigurationAdapterMock.mockReset();
    deleteTimerConfigurationMock.mockClear();
    executeMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject malformed input without touching the repository", async () => {
    const { deleteTimerConfigurationAction } =
      await import("../delete-timer-configuration.action");
    const malformedId = 42 as unknown as string;

    const result = await deleteTimerConfigurationAction(malformedId);

    expect(result).toEqual({ ok: false, code: "unknown" });
    expect(createCookieSessionAdapterMock).not.toHaveBeenCalled();
  });

  it("should return unauthenticated with no session, without constructing the backend adapter", async () => {
    const { deleteTimerConfigurationAction } =
      await import("../delete-timer-configuration.action");
    getMock.mockResolvedValue(null);

    const result = await deleteTimerConfigurationAction("some-id");

    expect(result).toEqual({ ok: false, code: "unauthenticated" });
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
  });

  it("should return not-found when the target record is missing", async () => {
    const { deleteTimerConfigurationAction } =
      await import("../delete-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockRejectedValue(timerConfigurationNotFound("missing-id"));

    const result = await deleteTimerConfigurationAction("missing-id");

    expect(result).toEqual({ ok: false, code: "not-found" });
  });

  it("should return ok:true with null on success", async () => {
    const { deleteTimerConfigurationAction } =
      await import("../delete-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockResolvedValue(undefined);

    const result = await deleteTimerConfigurationAction("some-id");

    expect(result).toEqual({ ok: true, data: null });
  });
});

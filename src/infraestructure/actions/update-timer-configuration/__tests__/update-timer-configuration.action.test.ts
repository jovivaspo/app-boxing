import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  invalidTimerConfiguration,
  timerConfigurationNotFound,
} from "@/domain/errors/timer-configuration-errors";
import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";

const getMock = vi.fn();
const createCookieSessionAdapterMock = vi.fn(() => ({ get: getMock }));

const createBackendTimerConfigurationAdapterMock = vi.fn();

const executeMock = vi.fn();
const updateTimerConfigurationMock = vi.fn<
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
  "@/application/use-cases/update-timer-configuration/update-timer-configuration",
  () => ({
    updateTimerConfiguration: (deps: unknown) =>
      updateTimerConfigurationMock(deps),
  })
);

describe("updateTimerConfigurationAction", () => {
  beforeEach(() => {
    getMock.mockReset();
    createCookieSessionAdapterMock.mockClear();
    createBackendTimerConfigurationAdapterMock.mockReset();
    updateTimerConfigurationMock.mockClear();
    executeMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject malformed input without touching the repository", async () => {
    const { updateTimerConfigurationAction } =
      await import("../update-timer-configuration.action");
    const malformedConfig = { name: "Round 1" } as unknown as ReturnType<
      typeof buildTimerConfiguration
    >;

    const result = await updateTimerConfigurationAction(malformedConfig);

    expect(result).toEqual({ ok: false, code: "unknown" });
    expect(createCookieSessionAdapterMock).not.toHaveBeenCalled();
  });

  it("should return unauthenticated with no session, without constructing the backend adapter", async () => {
    const { updateTimerConfigurationAction } =
      await import("../update-timer-configuration.action");
    getMock.mockResolvedValue(null);

    const result = await updateTimerConfigurationAction(
      buildTimerConfiguration()
    );

    expect(result).toEqual({ ok: false, code: "unauthenticated" });
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
  });

  it("should return invalid-configuration on non-positive values", async () => {
    const { updateTimerConfigurationAction } =
      await import("../update-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockRejectedValue(invalidTimerConfiguration());

    const result = await updateTimerConfigurationAction(
      buildTimerConfiguration({ rounds: 0 })
    );

    expect(result).toEqual({ ok: false, code: "invalid-configuration" });
  });

  it("should return not-found when the target record is missing", async () => {
    const { updateTimerConfigurationAction } =
      await import("../update-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    const config = buildTimerConfiguration({ id: "missing-id" });
    executeMock.mockRejectedValue(timerConfigurationNotFound("missing-id"));

    const result = await updateTimerConfigurationAction(config);

    expect(result).toEqual({ ok: false, code: "not-found" });
  });

  it("should return ok:true with the updated configuration on success", async () => {
    const { updateTimerConfigurationAction } =
      await import("../update-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    const updated = buildTimerConfiguration();
    executeMock.mockResolvedValue(updated);

    const result = await updateTimerConfigurationAction(updated);

    expect(result).toEqual({ ok: true, data: updated });
  });
});

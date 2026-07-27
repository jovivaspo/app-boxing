import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { invalidTimerConfiguration } from "@/domain/errors/timer-configuration-errors";
import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";

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

describe("createTimerConfigurationAction", () => {
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

  it("should reject malformed input without touching the repository", async () => {
    const { createTimerConfigurationAction } =
      await import("../create-timer-configuration.action");
    const malformedCandidate = { name: "Round 1" } as unknown as Omit<
      ReturnType<typeof buildTimerConfiguration>,
      "id"
    >;

    const result = await createTimerConfigurationAction(malformedCandidate);

    expect(result).toEqual({ ok: false, code: "unknown" });
    expect(createCookieSessionAdapterMock).not.toHaveBeenCalled();
  });

  it("should return unauthenticated with no session, without constructing the backend adapter", async () => {
    const { createTimerConfigurationAction } =
      await import("../create-timer-configuration.action");
    getMock.mockResolvedValue(null);
    const { id: _id, ...candidate } = buildTimerConfiguration();

    const result = await createTimerConfigurationAction(candidate);

    expect(result).toEqual({ ok: false, code: "unauthenticated" });
    expect(createBackendTimerConfigurationAdapterMock).not.toHaveBeenCalled();
  });

  it("should return invalid-configuration when rounds, roundDuration, or restDuration is non-positive", async () => {
    const { createTimerConfigurationAction } =
      await import("../create-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    executeMock.mockRejectedValue(invalidTimerConfiguration());
    const { id: _id, ...candidate } = buildTimerConfiguration({ rounds: 0 });

    const result = await createTimerConfigurationAction(candidate);

    expect(result).toEqual({ ok: false, code: "invalid-configuration" });
  });

  it("should return ok:true with the created configuration on success", async () => {
    const { createTimerConfigurationAction } =
      await import("../create-timer-configuration.action");
    getMock.mockResolvedValue({ token: "backend-jwt", user: {} });
    createBackendTimerConfigurationAdapterMock.mockReturnValue({});
    const created = buildTimerConfiguration();
    executeMock.mockResolvedValue(created);
    const { id: _id, ...candidate } = created;

    const result = await createTimerConfigurationAction(candidate);

    expect(result).toEqual({ ok: true, data: created });
  });
});

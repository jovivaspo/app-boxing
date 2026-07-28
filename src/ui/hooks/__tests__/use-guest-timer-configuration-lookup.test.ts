// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { useRouter } from "next/navigation";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeTimerConfigurationRepositoryPort } from "@/application/ports/__mocks__/timer-configuration-repository-port.mock";
import { timerConfigurationNotFound } from "@/domain/errors/timer-configuration-errors";

import { useGuestTimerConfigurationLookup } from "../use-guest-timer-configuration-lookup";

function makeRouter(): ReturnType<typeof useRouter> {
  return { replace: vi.fn() } as unknown as ReturnType<typeof useRouter>;
}

describe("useGuestTimerConfigurationLookup", () => {
  it("should not call the adapter when authenticated", () => {
    const localAdapter = makeTimerConfigurationRepositoryPort();

    renderHook(() =>
      useGuestTimerConfigurationLookup(
        true,
        "tc-1",
        null,
        localAdapter,
        makeRouter()
      )
    );

    expect(localAdapter.getById).not.toHaveBeenCalled();
  });

  it("should not call the adapter when there is no timerId", () => {
    const localAdapter = makeTimerConfigurationRepositoryPort();

    renderHook(() =>
      useGuestTimerConfigurationLookup(
        false,
        undefined,
        null,
        localAdapter,
        makeRouter()
      )
    );

    expect(localAdapter.getById).not.toHaveBeenCalled();
  });

  it("should not call the adapter when an initialConfiguration is already provided", () => {
    const localAdapter = makeTimerConfigurationRepositoryPort();

    renderHook(() =>
      useGuestTimerConfigurationLookup(
        false,
        "tc-1",
        buildTimerConfiguration(),
        localAdapter,
        makeRouter()
      )
    );

    expect(localAdapter.getById).not.toHaveBeenCalled();
  });

  it("should resolve the configuration via the injected adapter and expose it", async () => {
    const config = buildTimerConfiguration({ id: "tc-1" });
    const localAdapter = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockResolvedValue(config),
    });

    const { result } = renderHook(() =>
      useGuestTimerConfigurationLookup(
        false,
        "tc-1",
        null,
        localAdapter,
        makeRouter()
      )
    );

    await waitFor(() => expect(result.current.config).toEqual(config));
    expect(localAdapter.getById).toHaveBeenCalledWith("tc-1");
    expect(result.current.notFound).toBe(false);
  });

  it("should call onResolved with the resolved configuration", async () => {
    const config = buildTimerConfiguration({ id: "tc-1" });
    const localAdapter = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockResolvedValue(config),
    });
    const onResolved = vi.fn();

    renderHook(() =>
      useGuestTimerConfigurationLookup(
        false,
        "tc-1",
        null,
        localAdapter,
        makeRouter(),
        onResolved
      )
    );

    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(config));
  });

  it("should mark notFound and redirect to /timers when the configuration is missing", async () => {
    const router = makeRouter();
    const localAdapter = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockRejectedValue(timerConfigurationNotFound("tc-1")),
    });

    const { result } = renderHook(() =>
      useGuestTimerConfigurationLookup(
        false,
        "tc-1",
        null,
        localAdapter,
        router
      )
    );

    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(router.replace).toHaveBeenCalledWith("/timers");
  });

  it("should log the failure without throwing when the lookup rejects", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = timerConfigurationNotFound("tc-1");
    const localAdapter = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockRejectedValue(error),
    });

    renderHook(() =>
      useGuestTimerConfigurationLookup(
        false,
        "tc-1",
        null,
        localAdapter,
        makeRouter()
      )
    );

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Guest timer configuration lookup failed",
        error
      )
    );

    consoleErrorSpy.mockRestore();
  });

  it("should not call onResolved after unmount even if the lookup resolves later", async () => {
    let resolveLookup: (
      config: ReturnType<typeof buildTimerConfiguration>
    ) => void;
    const lookupPromise = new Promise<
      ReturnType<typeof buildTimerConfiguration>
    >((resolve) => {
      resolveLookup = resolve;
    });
    const localAdapter = makeTimerConfigurationRepositoryPort({
      getById: vi.fn().mockReturnValue(lookupPromise),
    });
    const onResolved = vi.fn();

    const { unmount } = renderHook(() =>
      useGuestTimerConfigurationLookup(
        false,
        "tc-1",
        null,
        localAdapter,
        makeRouter(),
        onResolved
      )
    );

    unmount();
    resolveLookup!(buildTimerConfiguration());
    await Promise.resolve();

    expect(onResolved).not.toHaveBeenCalled();
  });
});

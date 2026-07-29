// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { makeGuestTimerConfigurationPort } from "@/application/ports/__mocks__/guest-timer-configuration-port.mock";

const listActionMock = vi.fn();
const createActionMock = vi.fn();
const updateActionMock = vi.fn();
const deleteActionMock = vi.fn();

vi.mock(
  "@/infraestructure/actions/list-timer-configuration/list-timer-configuration.action",
  () => ({
    listTimerConfigurationsAction: (...args: unknown[]) =>
      listActionMock(...args),
  })
);
vi.mock(
  "@/infraestructure/actions/create-timer-configuration/create-timer-configuration.action",
  () => ({
    createTimerConfigurationAction: (...args: unknown[]) =>
      createActionMock(...args),
  })
);
vi.mock(
  "@/infraestructure/actions/update-timer-configuration/update-timer-configuration.action",
  () => ({
    updateTimerConfigurationAction: (...args: unknown[]) =>
      updateActionMock(...args),
  })
);
vi.mock(
  "@/infraestructure/actions/delete-timer-configuration/delete-timer-configuration.action",
  () => ({
    deleteTimerConfigurationAction: (...args: unknown[]) =>
      deleteActionMock(...args),
  })
);

import { useTimerConfigurations } from "../use-timer-configurations";

function buildCandidate(config = buildTimerConfiguration()) {
  const { id: _id, ...candidate } = config;
  return candidate;
}

describe("useTimerConfigurations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the list action, never the injected adapter, when authenticated", async () => {
    listActionMock.mockResolvedValue({ ok: true, data: [] });
    const localAdapter = makeGuestTimerConfigurationPort();

    const { result } = renderHook(() =>
      useTimerConfigurations(true, localAdapter)
    );
    await result.current.list();

    expect(listActionMock).toHaveBeenCalledTimes(1);
    expect(localAdapter.read).not.toHaveBeenCalled();
  });

  it("should call read() on the injected adapter and array-wrap the result, never the action, when guest", async () => {
    const config = buildTimerConfiguration();
    const localAdapter = makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(config),
    });

    const { result } = renderHook(() =>
      useTimerConfigurations(false, localAdapter)
    );
    const value = await result.current.list();

    expect(localAdapter.read).toHaveBeenCalledTimes(1);
    expect(listActionMock).not.toHaveBeenCalled();
    expect(value).toEqual({ ok: true, data: [config] });
  });

  it("should array-wrap an empty result when read() resolves null for guest list", async () => {
    const localAdapter = makeGuestTimerConfigurationPort({
      read: vi.fn().mockResolvedValue(null),
    });

    const { result } = renderHook(() =>
      useTimerConfigurations(false, localAdapter)
    );

    await expect(result.current.list()).resolves.toEqual({
      ok: true,
      data: [],
    });
  });

  it("should return a Result and never throw when the guest-path adapter rejects", async () => {
    const localAdapter = makeGuestTimerConfigurationPort({
      write: vi.fn().mockRejectedValue(new Error("boom")),
    });

    const { result } = renderHook(() =>
      useTimerConfigurations(false, localAdapter)
    );

    await expect(result.current.create(buildCandidate())).resolves.toEqual({
      ok: false,
      code: "unknown",
    });
  });

  it("should keep the returned operations object referentially stable across re-renders with the same isAuthenticated/localAdapter", () => {
    const localAdapter = makeGuestTimerConfigurationPort();

    const { result, rerender } = renderHook(
      ({ isAuthenticated }: { isAuthenticated: boolean }) =>
        useTimerConfigurations(isAuthenticated, localAdapter),
      { initialProps: { isAuthenticated: true } }
    );
    const first = result.current;
    rerender({ isAuthenticated: true });

    expect(result.current).toBe(first);
  });

  it("should call the create action, never the injected adapter, when authenticated", async () => {
    const config = buildTimerConfiguration();
    const candidate = buildCandidate(config);
    createActionMock.mockResolvedValue({ ok: true, data: config });
    const localAdapter = makeGuestTimerConfigurationPort();

    const { result } = renderHook(() =>
      useTimerConfigurations(true, localAdapter)
    );
    await result.current.create(candidate);

    expect(createActionMock).toHaveBeenCalledWith(candidate);
    expect(localAdapter.write).not.toHaveBeenCalled();
  });

  it("should call write() on the injected adapter, never the action, when guest creates", async () => {
    const config = buildTimerConfiguration();
    const candidate = buildCandidate(config);
    const localAdapter = makeGuestTimerConfigurationPort({
      write: vi.fn().mockResolvedValue(config),
    });

    const { result } = renderHook(() =>
      useTimerConfigurations(false, localAdapter)
    );
    const value = await result.current.create(candidate);

    const { name: _name, ...expectedInput } = candidate;
    expect(localAdapter.write).toHaveBeenCalledWith(expectedInput);
    expect(createActionMock).not.toHaveBeenCalled();
    expect(value).toEqual({ ok: true, data: config });
  });

  it("should call the update action, never the injected adapter, when authenticated", async () => {
    const config = buildTimerConfiguration();
    updateActionMock.mockResolvedValue({ ok: true, data: config });
    const localAdapter = makeGuestTimerConfigurationPort();

    const { result } = renderHook(() =>
      useTimerConfigurations(true, localAdapter)
    );
    await result.current.update(config);

    expect(updateActionMock).toHaveBeenCalledWith(config);
    expect(localAdapter.write).not.toHaveBeenCalled();
  });

  it("should call write() on the injected adapter with id/name stripped, never the action, when guest updates", async () => {
    const config = buildTimerConfiguration();
    const localAdapter = makeGuestTimerConfigurationPort({
      write: vi.fn().mockResolvedValue(config),
    });

    const { result } = renderHook(() =>
      useTimerConfigurations(false, localAdapter)
    );
    const value = await result.current.update(config);

    const { id: _id, name: _name, ...expectedInput } = config;
    expect(localAdapter.write).toHaveBeenCalledWith(expectedInput);
    expect(updateActionMock).not.toHaveBeenCalled();
    expect(value).toEqual({ ok: true, data: config });
  });

  it("should call the remove action, never the injected adapter, when authenticated", async () => {
    deleteActionMock.mockResolvedValue({ ok: true, data: null });
    const localAdapter = makeGuestTimerConfigurationPort();

    const { result } = renderHook(() =>
      useTimerConfigurations(true, localAdapter)
    );
    await result.current.remove("tc-1");

    expect(deleteActionMock).toHaveBeenCalledWith("tc-1");
    expect(localAdapter.clear).not.toHaveBeenCalled();
  });

  it("should call clear() on the injected adapter, ignoring id, never the action, when guest removes", async () => {
    const localAdapter = makeGuestTimerConfigurationPort({
      clear: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() =>
      useTimerConfigurations(false, localAdapter)
    );
    const value = await result.current.remove("tc-1");

    expect(localAdapter.clear).toHaveBeenCalledWith();
    expect(deleteActionMock).not.toHaveBeenCalled();
    expect(value).toEqual({ ok: true, data: null });
  });
});

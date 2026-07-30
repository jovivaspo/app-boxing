// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";

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

  it("should keep the returned operations object referentially stable across re-renders", () => {
    const { result, rerender } = renderHook(() => useTimerConfigurations());
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });

  it("should call the list action", async () => {
    listActionMock.mockResolvedValue({ ok: true, data: [] });

    const { result } = renderHook(() => useTimerConfigurations());
    await result.current.list();

    expect(listActionMock).toHaveBeenCalledTimes(1);
  });

  it("should call the create action", async () => {
    const config = buildTimerConfiguration();
    const candidate = buildCandidate(config);
    createActionMock.mockResolvedValue({ ok: true, data: config });

    const { result } = renderHook(() => useTimerConfigurations());
    await result.current.create(candidate);

    expect(createActionMock).toHaveBeenCalledWith(candidate);
  });

  it("should call the update action", async () => {
    const config = buildTimerConfiguration();
    updateActionMock.mockResolvedValue({ ok: true, data: config });

    const { result } = renderHook(() => useTimerConfigurations());
    await result.current.update(config);

    expect(updateActionMock).toHaveBeenCalledWith(config);
  });

  it("should call the remove action", async () => {
    deleteActionMock.mockResolvedValue({ ok: true, data: null });

    const { result } = renderHook(() => useTimerConfigurations());
    await result.current.remove("tc-1");

    expect(deleteActionMock).toHaveBeenCalledWith("tc-1");
  });
});

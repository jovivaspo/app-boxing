// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";

const listMock = vi.fn();
const removeMock = vi.fn();
// Stable reference across renders, mirroring the real hook's `useMemo`
// identity guarantee — a fresh object per call would retrigger the
// mount effect on every re-render.
const ops = {
  list: listMock,
  create: vi.fn(),
  update: vi.fn(),
  remove: removeMock,
};
const useTimerConfigurationsMock = vi.fn(() => ops);

vi.mock("@/ui/hooks/use-timer-configurations", () => ({
  useTimerConfigurations: () => useTimerConfigurationsMock(),
}));

import { useTimerConfigurationList } from "../timer-configuration-list.hook";

describe("useTimerConfigurationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load configurations on mount", async () => {
    const config = buildTimerConfiguration();
    listMock.mockResolvedValue({ ok: true, data: [config] });

    const { result } = renderHook(() => useTimerConfigurationList());

    await waitFor(() =>
      expect(result.current.configurations).toEqual([config])
    );
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("should expose the empty state when list resolves with []", async () => {
    listMock.mockResolvedValue({ ok: true, data: [] });

    const { result } = renderHook(() => useTimerConfigurationList());

    await waitFor(() => expect(result.current.isEmpty).toBe(true));
  });

  it("should remove a row optimistically before the delete call resolves", async () => {
    const config = buildTimerConfiguration({ id: "tc-1" });
    listMock.mockResolvedValue({ ok: true, data: [config] });
    let resolveRemove!: (value: { ok: true; data: null }) => void;
    removeMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRemove = resolve;
      })
    );

    const { result } = renderHook(() => useTimerConfigurationList());
    await waitFor(() =>
      expect(result.current.configurations).toEqual([config])
    );

    act(() => {
      result.current.remove("tc-1");
    });

    expect(result.current.configurations).toEqual([]);

    resolveRemove({ ok: true, data: null });
    await waitFor(() => expect(result.current.configurations).toEqual([]));
  });

  it("should restore the row and set an error when delete fails", async () => {
    const config = buildTimerConfiguration({ id: "tc-1" });
    listMock.mockResolvedValue({ ok: true, data: [config] });
    removeMock.mockResolvedValue({ ok: false, code: "unknown" });

    const { result } = renderHook(() => useTimerConfigurationList());
    await waitFor(() =>
      expect(result.current.configurations).toEqual([config])
    );

    act(() => {
      result.current.remove("tc-1");
    });

    await waitFor(() =>
      expect(result.current.configurations).toEqual([config])
    );
    expect(result.current.error).not.toBeNull();
  });

  it("should set a load-specific error, distinct from the delete error, when the initial list call fails", async () => {
    listMock.mockResolvedValue({ ok: false, code: "unknown" });

    const { result } = renderHook(() => useTimerConfigurationList());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).not.toBe(
      "No se pudo eliminar el timer. Intentá de nuevo."
    );
  });

  it("should not report isEmpty when the initial list call fails", async () => {
    listMock.mockResolvedValue({ ok: false, code: "unknown" });

    const { result } = renderHook(() => useTimerConfigurationList());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isEmpty).toBe(false);
  });

  it("should call remove exactly once even when React double-invokes state updaters (StrictMode)", async () => {
    const config = buildTimerConfiguration({ id: "tc-1" });
    listMock.mockResolvedValue({ ok: true, data: [config] });
    removeMock.mockResolvedValue({ ok: true, data: null });

    const { result } = renderHook(() => useTimerConfigurationList(), {
      wrapper: StrictMode,
    });
    await waitFor(() =>
      expect(result.current.configurations).toEqual([config])
    );

    act(() => {
      result.current.remove("tc-1");
    });

    await waitFor(() => expect(removeMock).toHaveBeenCalledTimes(1));
  });

  it("should restore the removed row at its original index when delete fails", async () => {
    const first = buildTimerConfiguration({ id: "tc-1" });
    const middle = buildTimerConfiguration({ id: "tc-2" });
    const last = buildTimerConfiguration({ id: "tc-3" });
    listMock.mockResolvedValue({ ok: true, data: [first, middle, last] });
    removeMock.mockResolvedValue({ ok: false, code: "unknown" });

    const { result } = renderHook(() => useTimerConfigurationList());
    await waitFor(() =>
      expect(result.current.configurations).toEqual([first, middle, last])
    );

    act(() => {
      result.current.remove("tc-2");
    });

    await waitFor(() =>
      expect(result.current.configurations).toEqual([first, middle, last])
    );
  });
});

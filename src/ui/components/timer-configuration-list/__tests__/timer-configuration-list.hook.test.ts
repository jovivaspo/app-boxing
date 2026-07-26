// @vitest-environment jsdom
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

    const { result } = renderHook(() => useTimerConfigurationList(true));

    await waitFor(() =>
      expect(result.current.configurations).toEqual([config])
    );
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("should expose the empty state when list resolves with []", async () => {
    listMock.mockResolvedValue({ ok: true, data: [] });

    const { result } = renderHook(() => useTimerConfigurationList(true));

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

    const { result } = renderHook(() => useTimerConfigurationList(true));
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

    const { result } = renderHook(() => useTimerConfigurationList(true));
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
});

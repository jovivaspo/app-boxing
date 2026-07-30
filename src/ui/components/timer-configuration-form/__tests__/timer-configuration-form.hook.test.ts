// @vitest-environment jsdom
import type { FormEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";

const pushMock = vi.fn();
const opsCreateMock = vi.fn();
const opsUpdateMock = vi.fn();
const ops = {
  list: vi.fn(),
  create: opsCreateMock,
  update: opsUpdateMock,
  remove: vi.fn(),
};
const useTimerConfigurationsMock = vi.fn(() => ops);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/ui/hooks/use-timer-configurations", () => ({
  useTimerConfigurations: () => useTimerConfigurationsMock(),
}));

import { useTimerConfigurationForm } from "../timer-configuration-form.hook";

function fakeSubmitEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

describe("useTimerConfigurationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pre-fill split minutes/seconds when initialConfiguration is provided", () => {
    const config = buildTimerConfiguration({
      roundDuration: 90,
      restDuration: 45,
    });

    const { result } = renderHook(() =>
      useTimerConfigurationForm({ initialConfiguration: config })
    );

    expect(result.current.form.roundMinutes).toBe(1);
    expect(result.current.form.roundSeconds).toBe(30);
    expect(result.current.form.restMinutes).toBe(0);
    expect(result.current.form.restSeconds).toBe(45);
  });

  it("should combine minutes and seconds into total seconds on submit", async () => {
    opsCreateMock.mockResolvedValue({
      ok: true,
      data: buildTimerConfiguration(),
    });

    const { result } = renderHook(() =>
      useTimerConfigurationForm({ initialConfiguration: null })
    );

    act(() => {
      result.current.setRoundMinutes(1);
      result.current.setRoundSeconds(30);
      result.current.setRestMinutes(0);
      result.current.setRestSeconds(30);
    });
    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(opsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ roundDuration: 90, restDuration: 30 })
    );
  });

  it("should block submit and set fieldErrors when a combined duration is <= 0", async () => {
    const { result } = renderHook(() =>
      useTimerConfigurationForm({ initialConfiguration: null })
    );

    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(opsCreateMock).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.roundDuration).toBeDefined();
    expect(result.current.fieldErrors.restDuration).toBeDefined();
  });

  it("should call router.push('/timers') on successful create or update", async () => {
    opsCreateMock.mockResolvedValue({
      ok: true,
      data: buildTimerConfiguration(),
    });

    const { result } = renderHook(() =>
      useTimerConfigurationForm({ initialConfiguration: null })
    );

    act(() => {
      result.current.setRoundMinutes(1);
      result.current.setRestMinutes(1);
    });
    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(pushMock).toHaveBeenCalledWith("/timers");
  });

  it("should map each failure code to its ERROR_CODE_COPY message in formError", async () => {
    opsCreateMock.mockResolvedValue({ ok: false, code: "unknown" });

    const { result } = renderHook(() =>
      useTimerConfigurationForm({ initialConfiguration: null })
    );

    act(() => {
      result.current.setRoundMinutes(1);
      result.current.setRestMinutes(1);
    });
    await act(async () => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(result.current.formError).not.toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

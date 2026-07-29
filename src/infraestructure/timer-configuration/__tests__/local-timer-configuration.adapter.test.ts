// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { createLocalTimerConfigurationAdapter } from "../local-timer-configuration.adapter";

function buildInput(
  overrides: Partial<ReturnType<typeof buildTimerConfiguration>> = {}
) {
  const { id: _id, name: _name, ...rest } = buildTimerConfiguration(overrides);
  return rest;
}

describe("createLocalTimerConfigurationAdapter", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should persist the record under the guest-timer key so read() returns it", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    const written = await adapter.write(buildInput());
    const stored = window.localStorage.getItem("guest-timer");

    expect(stored).not.toBeNull();
    await expect(adapter.read()).resolves.toEqual(written);
  });

  it("should overwrite the stored record on a second write instead of appending", async () => {
    const adapter = createLocalTimerConfigurationAdapter();
    const first = await adapter.write(buildInput({ rounds: 5 }));

    const second = await adapter.write(buildInput({ rounds: 9 }));

    expect(second.id).toBe(first.id);
    await expect(adapter.read()).resolves.toEqual(second);
  });

  it("should resolve read() with null when nothing is stored", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    await expect(adapter.read()).resolves.toBeNull();
  });

  it("should throw InvalidTimerConfiguration when write() is called with non-positive rounds", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    await expect(
      adapter.write(buildInput({ rounds: 0 }))
    ).rejects.toMatchObject({ _tag: "InvalidTimerConfiguration" });
  });

  it("should throw InvalidTimerConfiguration when write() is called with non-positive roundDuration", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    await expect(
      adapter.write(buildInput({ roundDuration: 0 }))
    ).rejects.toMatchObject({ _tag: "InvalidTimerConfiguration" });
  });

  it("should not throw when write() is called with non-positive restDuration", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    await expect(
      adapter.write(buildInput({ restDuration: 0 }))
    ).resolves.toMatchObject({ restDuration: 0 });
  });

  it("should always set name to Guest timer regardless of any caller-supplied name", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    const written = await adapter.write(buildInput());

    expect(written.name).toBe("Guest timer");
  });

  it("should remove the stored record on clear() so a subsequent read() resolves null", async () => {
    const adapter = createLocalTimerConfigurationAdapter();
    await adapter.write(buildInput());

    await adapter.clear();

    await expect(adapter.read()).resolves.toBeNull();
  });

  it("should never read, write, or delete the legacy timer-configurations array key", async () => {
    window.localStorage.setItem(
      "timer-configurations",
      JSON.stringify([buildTimerConfiguration()])
    );
    const adapter = createLocalTimerConfigurationAdapter();

    await adapter.write(buildInput());
    await adapter.read();
    await adapter.clear();

    expect(window.localStorage.getItem("timer-configurations")).toEqual(
      JSON.stringify([buildTimerConfiguration()])
    );
  });

  describe("when no `window` is available (SSR)", () => {
    beforeEach(() => {
      vi.stubGlobal("window", undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should resolve read() with null", async () => {
      const adapter = createLocalTimerConfigurationAdapter();

      await expect(adapter.read()).resolves.toBeNull();
    });

    it("should reject write() instead of resolving with an unpersisted record", async () => {
      const adapter = createLocalTimerConfigurationAdapter();

      await expect(adapter.write(buildInput())).rejects.toThrow();
    });
  });
});

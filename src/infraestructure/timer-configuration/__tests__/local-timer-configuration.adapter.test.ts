// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTimerConfiguration } from "@/domain/timer-configuration/__builders__/timer-configuration.builder";
import { createLocalTimerConfigurationAdapter } from "../local-timer-configuration.adapter";

describe("createLocalTimerConfigurationAdapter", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should assign a generated id and resolve with the persisted record on create", async () => {
    const adapter = createLocalTimerConfigurationAdapter();
    const { id: _id, ...configWithoutId } = buildTimerConfiguration();

    const created = await adapter.create(configWithoutId);

    expect(created).toEqual({ ...configWithoutId, id: expect.any(String) });
  });

  it("should persist the created record so it appears in a subsequent list()", async () => {
    const adapter = createLocalTimerConfigurationAdapter();
    const { id: _id, ...configWithoutId } = buildTimerConfiguration();

    const created = await adapter.create(configWithoutId);
    const all = await adapter.list();

    expect(all).toEqual([created]);
  });

  it("should resolve list() with an empty array when nothing is stored", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    const all = await adapter.list();

    expect(all).toEqual([]);
  });

  it("should persist and resolve with the new values when updating an existing configuration", async () => {
    const adapter = createLocalTimerConfigurationAdapter();
    const { id: _id, ...configWithoutId } = buildTimerConfiguration();
    const created = await adapter.create(configWithoutId);

    const updated = await adapter.update({ ...created, name: "Renamed" });

    expect(updated).toEqual({ ...created, name: "Renamed" });
    await expect(adapter.list()).resolves.toEqual([updated]);
  });

  it("should reject with timerConfigurationNotFound when updating a missing configuration", async () => {
    const adapter = createLocalTimerConfigurationAdapter();
    const missing = buildTimerConfiguration({ id: "does-not-exist" });

    await expect(adapter.update(missing)).rejects.toMatchObject({
      _tag: "TimerConfigurationNotFound",
    });
  });

  it("should remove the record so it no longer appears in a subsequent list() on delete", async () => {
    const adapter = createLocalTimerConfigurationAdapter();
    const { id: _id, ...configWithoutId } = buildTimerConfiguration();
    const created = await adapter.create(configWithoutId);

    await adapter.delete(created.id);

    await expect(adapter.list()).resolves.toEqual([]);
  });

  it("should reject with timerConfigurationNotFound when deleting a missing configuration", async () => {
    const adapter = createLocalTimerConfigurationAdapter();

    await expect(adapter.delete("does-not-exist")).rejects.toMatchObject({
      _tag: "TimerConfigurationNotFound",
    });
  });

  describe("when no `window` is available (SSR)", () => {
    beforeEach(() => {
      vi.stubGlobal("window", undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should resolve list() with an empty array", async () => {
      const adapter = createLocalTimerConfigurationAdapter();

      await expect(adapter.list()).resolves.toEqual([]);
    });

    it("should reject update() with timerConfigurationNotFound when window is unavailable", async () => {
      const adapter = createLocalTimerConfigurationAdapter();
      const config = buildTimerConfiguration();

      await expect(adapter.update(config)).rejects.toMatchObject({
        _tag: "TimerConfigurationNotFound",
      });
    });

    it("should reject delete() with timerConfigurationNotFound when window is unavailable", async () => {
      const adapter = createLocalTimerConfigurationAdapter();

      await expect(adapter.delete("any-id")).rejects.toMatchObject({
        _tag: "TimerConfigurationNotFound",
      });
    });
  });
});

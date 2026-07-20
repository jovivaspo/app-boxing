// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getItem, removeItem, setItem } from "../local-storage.util";

describe("local-storage.util", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("should return the deserialized value with its original type after setItem", () => {
    setItem("count", 3);

    const result = getItem<number>("count");

    expect(result).toBe(3);
  });

  it("should return undefined when the key was never stored", () => {
    const result = getItem<string>("missing-key");

    expect(result).toBeUndefined();
  });

  it("should return undefined when the stored raw string is not valid JSON", () => {
    window.localStorage.setItem("corrupted-key", "{not-json");

    const result = getItem<string>("corrupted-key");

    expect(result).toBeUndefined();
  });

  it("should make a subsequent getItem return undefined after removeItem", () => {
    setItem("to-remove", { a: 1 });

    removeItem("to-remove");

    expect(getItem("to-remove")).toBeUndefined();
  });

  describe("when no `window` is available (SSR)", () => {
    beforeEach(() => {
      vi.stubGlobal("window", undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should return undefined from getItem without throwing", () => {
      expect(() => getItem("any-key")).not.toThrow();
      expect(getItem("any-key")).toBeUndefined();
    });

    it("should no-op setItem and removeItem without throwing", () => {
      expect(() => setItem("any-key", "value")).not.toThrow();
      expect(() => removeItem("any-key")).not.toThrow();
    });
  });
});

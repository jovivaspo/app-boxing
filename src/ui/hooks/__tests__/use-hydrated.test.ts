// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHydrated } from "../use-hydrated";

function Probe() {
  return createElement("span", null, String(useHydrated()));
}

describe("useHydrated", () => {
  it("should return true on a client render", () => {
    const { result } = renderHook(() => useHydrated());

    expect(result.current).toBe(true);
  });

  it("should return false in the server snapshot", () => {
    const html = renderToStaticMarkup(createElement(Probe));

    expect(html).toContain("false");
  });
});

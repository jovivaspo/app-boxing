// @vitest-environment jsdom
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useIsHydrated } from "../use-is-hydrated";

describe("useIsHydrated", () => {
  it("should return false while rendering on the server", () => {
    function Probe() {
      return createElement("span", null, String(useIsHydrated()));
    }

    const html = renderToString(createElement(Probe));

    expect(html).toContain("false");
  });

  it("should return true once rendered on the client", () => {
    const { result } = renderHook(() => useIsHydrated());

    expect(result.current).toBe(true);
  });
});

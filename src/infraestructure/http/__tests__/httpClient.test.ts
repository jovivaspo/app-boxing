import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHttpClient } from "../httpClient";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe("createHttpClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const verbs = [
    ["get", "GET"],
    ["post", "POST"],
    ["put", "PUT"],
    ["delete", "DELETE"],
  ] as const;

  it.each(verbs)(
    "should call fetch with method %s when %s is invoked",
    async (method, expectedVerb) => {
      const response = jsonResponse({ ok: true }) as Response;
      vi.mocked(fetch).mockResolvedValue(response);
      const http = createHttpClient();
      const init = {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hello: "world" }),
      };

      await http[method]("http://backend.test/resource", init);

      expect(fetch).toHaveBeenCalledWith("http://backend.test/resource", {
        ...init,
        method: expectedVerb,
      });
    }
  );

  it("should override a caller-supplied init.method with the verb method's own verb", async () => {
    const response = jsonResponse({ ok: true }) as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    const http = createHttpClient();

    await http.post("http://backend.test/resource", { method: "GET" });

    expect(fetch).toHaveBeenCalledWith("http://backend.test/resource", {
      method: "POST",
    });
  });

  it("should resolve with the same Response object identity fetch resolved", async () => {
    const response = jsonResponse({ ok: true }) as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    const http = createHttpClient();

    const result = await http.get("http://backend.test/resource");

    expect(result).toBe(response);
  });

  it("should resolve a non-2xx response instead of throwing", async () => {
    const response = jsonResponse({}, false, 500) as Response;
    vi.mocked(fetch).mockResolvedValue(response);
    const http = createHttpClient();

    const result = await http.get("http://backend.test/resource");

    expect(result).toBe(response);
  });

  it("should throw an Error named HttpRequestFailed with the original cause when fetch rejects", async () => {
    const networkError = new Error("network down");
    vi.mocked(fetch).mockRejectedValue(networkError);
    const http = createHttpClient();

    let caught: unknown;
    try {
      await http.get("http://backend.test/resource");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).name).toBe("HttpRequestFailed");
    expect((caught as { cause?: unknown }).cause).toBe(networkError);
    expect((caught as { _tag?: unknown })._tag).toBeUndefined();
  });

  it("should never include a URL or init/body content in the error message", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    const http = createHttpClient();

    let caught: unknown;
    try {
      await http.post("http://backend.test/secret?token=abc123", {
        body: JSON.stringify({ secret: "value" }),
      });
    } catch (error) {
      caught = error;
    }

    expect((caught as Error).message).not.toContain("http://");
    expect((caught as Error).message).not.toContain("token=abc123");
    expect((caught as Error).message).not.toContain("secret");
  });

  it("should never call console methods when fetch rejects", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    const http = createHttpClient();

    await expect(http.get("http://backend.test/resource")).rejects.toThrow();

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

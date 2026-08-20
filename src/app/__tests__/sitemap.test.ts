import { afterEach, describe, expect, it, vi } from "vitest";

describe("sitemap", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should list exactly /, /login, and /guest-timer", async () => {
    vi.stubEnv("SITE_URL", "https://ironpulse.example");
    const { default: sitemap } = await import("../sitemap");

    const result = sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      "https://ironpulse.example/",
      "https://ironpulse.example/login",
      "https://ironpulse.example/guest-timer",
    ]);
  });

  it("should not list /guest-timer-active", async () => {
    vi.stubEnv("SITE_URL", "https://ironpulse.example");
    const { default: sitemap } = await import("../sitemap");

    const result = sitemap();

    expect(
      result.some((entry) => entry.url.endsWith("/guest-timer-active"))
    ).toBe(false);
  });

  it("should opt out of Route Handler caching", async () => {
    const { dynamic } = await import("../sitemap");

    expect(dynamic).toBe("force-dynamic");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

describe("robots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should allow the public routes", async () => {
    vi.stubEnv("SITE_URL", "https://ironpulse.example");
    const { default: robots } = await import("../robots");

    const result = robots();

    expect(result.rules).toMatchObject({
      userAgent: "*",
      allow: ["/", "/login", "/guest-timer"],
    });
  });

  it("should disallow the non-public routes", async () => {
    vi.stubEnv("SITE_URL", "https://ironpulse.example");
    const { default: robots } = await import("../robots");

    const result = robots();

    expect(result.rules).toMatchObject({
      disallow: ["/api", "/profile", "/timers", "/guest-timer-active"],
    });
  });

  it("should reference the sitemap built from siteUrl", async () => {
    vi.stubEnv("SITE_URL", "https://ironpulse.example");
    const { default: robots } = await import("../robots");

    const result = robots();

    expect(result.sitemap).toBe("https://ironpulse.example/sitemap.xml");
  });

  it("should opt out of Route Handler caching", async () => {
    const { dynamic } = await import("../robots");

    expect(dynamic).toBe("force-dynamic");
  });
});

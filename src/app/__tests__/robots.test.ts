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

  // Without a disallow list an allow-only rule set is a no-op: `Allow` only
  // carves exceptions out of a disallowed path, so every unlisted route stays
  // crawlable by default. These are the routes that must NOT be indexed.
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

  // Route Handlers are cached by default. Dropping this export would bake the
  // build-time SITE_URL into the response, which no other check would catch.
  it("should opt out of Route Handler caching", async () => {
    const { dynamic } = await import("../robots");

    expect(dynamic).toBe("force-dynamic");
  });
});

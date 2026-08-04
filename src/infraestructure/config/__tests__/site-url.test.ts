import { afterEach, describe, expect, it, vi } from "vitest";

describe("siteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return SITE_URL when it is set", async () => {
    vi.stubEnv("SITE_URL", "https://ironpulse.example");
    const { siteUrl } = await import("../site-url");

    const result = siteUrl();

    expect(result).toBe("https://ironpulse.example");
  });

  it("should fall back to http://localhost:3000 when SITE_URL is unset", async () => {
    vi.stubEnv("SITE_URL", undefined);
    const { siteUrl } = await import("../site-url");

    const result = siteUrl();

    expect(result).toBe("http://localhost:3000");
  });

  it("should fall back to http://localhost:3000 when SITE_URL is an empty string", async () => {
    vi.stubEnv("SITE_URL", "");
    const { siteUrl } = await import("../site-url");

    const result = siteUrl();

    expect(result).toBe("http://localhost:3000");
  });

  // A malformed value must degrade, never throw: `siteUrl()` feeds
  // `new URL()` at root-layout module scope, so throwing here would take
  // every route down over an ops typo.
  it("should fall back to http://localhost:3000 when SITE_URL has no scheme", async () => {
    vi.stubEnv("SITE_URL", "ironpulse.example");
    const { siteUrl } = await import("../site-url");

    const result = siteUrl();

    expect(result).toBe("http://localhost:3000");
  });

  it("should return a value that never throws when passed to the URL constructor", async () => {
    vi.stubEnv("SITE_URL", "not a url at all");
    const { siteUrl } = await import("../site-url");

    expect(() => new URL(siteUrl())).not.toThrow();
  });
});

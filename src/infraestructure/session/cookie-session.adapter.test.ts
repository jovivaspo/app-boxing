import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@/domain/session.model";
import { sign } from "./hmac";

// Characterization + new-behavior scaffold (Phase 3.1 + 7.3):
// - Preserves current `jwt`/`user` cookie NAMES, `maxAge` (7d), `secure`
//   (prod-only), `sameSite` (lax), `path` (/).
// - Hardens `user` cookie to `httpOnly: true` (was `false` on the legacy
//   plain-JSON cookie set by the pre-refactor login Server Action — see
//   the deleted legacy characterization test for that old flag).
// - `user` cookie value is now an HMAC-signed string, never plain JSON.
// - `get()` fails closed to `null` on missing, tampered, or legacy
//   plain-JSON cookies (D3) — no dual-format compatibility path.

const SESSION_SECRET = "test-session-secret";
const EXPECTED_MAX_AGE = 60 * 60 * 24 * 7;
const EXPECTED_SECURE = process.env.NODE_ENV === "production";

type FakeCookie = { value: string; options?: Record<string, unknown> };

function createFakeCookieStore() {
  const store = new Map<string, FakeCookie>();
  return {
    get: vi.fn((name: string): FakeCookie | undefined => store.get(name)),
    set: vi.fn(
      (name: string, value: string, options?: Record<string, unknown>) => {
        store.set(name, { value, options });
      }
    ),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
    __store: store,
  };
}

let fakeCookieStore = createFakeCookieStore();
const cookiesMock = vi.fn(() => Promise.resolve(fakeCookieStore));

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

const validUser = {
  id: "1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "boxer",
  pictureUrl: "https://example.com/pic.png",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const validSession: Session = { token: "backend-jwt", user: validUser };

describe("createCookieSessionAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
    fakeCookieStore = createFakeCookieStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("sets the jwt cookie with the current flags (httpOnly, secure prod-only, lax, /, 7d)", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();

      await adapter.create(validSession);

      expect(fakeCookieStore.set).toHaveBeenCalledWith("jwt", "backend-jwt", {
        httpOnly: true,
        secure: EXPECTED_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: EXPECTED_MAX_AGE,
      });
    });

    it("sets a signed user cookie, hardened to httpOnly: true, with the same flags as jwt", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();

      await adapter.create(validSession);

      const userCall = fakeCookieStore.set.mock.calls.find(
        (call) => call[0] === "user"
      );
      expect(userCall).toBeDefined();
      const [, signedValue, options] = userCall!;

      expect(options).toEqual({
        httpOnly: true,
        secure: EXPECTED_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: EXPECTED_MAX_AGE,
      });
      // The cookie value must not be plain JSON — it must be signed.
      expect(() => JSON.parse(signedValue as string)).toThrow();
      expect(signedValue).toContain(".");
    });

    it("throws when SESSION_SECRET is not configured (config error, fail closed)", async () => {
      vi.stubEnv("SESSION_SECRET", "");
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();

      await expect(adapter.create(validSession)).rejects.toThrow();
      expect(fakeCookieStore.set).not.toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("returns the session when the cookies were set via create() (round trip)", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();
      await adapter.create(validSession);

      const result = await adapter.get();

      expect(result).toEqual(validSession);
    });

    it("returns null when no cookies are present", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();

      const result = await adapter.get();

      expect(result).toBeNull();
    });

    it("returns null when the jwt cookie is missing but user cookie is present", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();
      fakeCookieStore.set(
        "user",
        sign(JSON.stringify(validUser), SESSION_SECRET),
        {}
      );

      const result = await adapter.get();

      expect(result).toBeNull();
    });

    it("returns null when the user cookie's signature has been tampered with", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();
      await adapter.create(validSession);
      const tampered = `${fakeCookieStore.__store.get("user")!.value}tampered`;
      fakeCookieStore.__store.set("user", { value: tampered });

      const result = await adapter.get();

      expect(result).toBeNull();
    });

    it("returns null for a legacy unsigned plain-JSON user cookie (D3 — no dual-format path)", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();
      fakeCookieStore.set("jwt", "backend-jwt", {});
      fakeCookieStore.set("user", JSON.stringify(validUser), {});

      const result = await adapter.get();

      expect(result).toBeNull();
    });

    it("returns null when SESSION_SECRET is not configured (fail closed)", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();
      await adapter.create(validSession);
      vi.stubEnv("SESSION_SECRET", "");

      const result = await adapter.get();

      expect(result).toBeNull();
    });
  });

  describe("clear", () => {
    it("deletes both the jwt and user cookies", async () => {
      const { createCookieSessionAdapter } =
        await import("./cookie-session.adapter");
      const adapter = createCookieSessionAdapter();
      await adapter.create(validSession);

      await adapter.clear();

      expect(fakeCookieStore.delete).toHaveBeenCalledWith("jwt");
      expect(fakeCookieStore.delete).toHaveBeenCalledWith("user");
    });
  });
});

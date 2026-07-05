import { cookies } from "next/headers";

import type { User } from "@/domain/user.model";
import type { Session } from "@/domain/session.model";
import type { SessionPort } from "@/application/ports/session.port";
import { sign, verify } from "./hmac";

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

/**
 * Shared cookie flags for both `jwt` and `user` cookies: `httpOnly` (the
 * `user` cookie is now hardened to `true` — nothing client-side reads it
 * anymore, unlike the legacy plain-JSON cookie), `secure` in production
 * only, `sameSite: "lax"`, root `path`, and a 7-day `maxAge` — all
 * preserved from the pre-refactor behavior.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SEVEN_DAYS_IN_SECONDS,
  };
}

/**
 * Creates the `SessionPort` implementation backed by signed HTTP cookies.
 * Reads `SESSION_SECRET` on every call (required, no fallback) — signing
 * fails closed (throws) on `create`, and reading fails closed (`null`) on
 * `get`, forcing re-login instead of trusting an unsigned/tampered value.
 */
export function createCookieSessionAdapter(): SessionPort {
  return {
    async create(session: Session): Promise<void> {
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        throw new Error("SESSION_SECRET is not configured");
      }

      const cookieStore = await cookies();
      const options = cookieOptions();

      cookieStore.set("jwt", session.token, options);
      cookieStore.set(
        "user",
        sign(JSON.stringify(session.user), secret),
        options
      );
    },

    async get(): Promise<Session | null> {
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        return null;
      }

      const cookieStore = await cookies();
      const jwt = cookieStore.get("jwt")?.value;
      const userCookie = cookieStore.get("user")?.value;
      if (!jwt || !userCookie) {
        return null;
      }

      const verified = verify(userCookie, secret);
      if (!verified) {
        return null;
      }

      try {
        const user = JSON.parse(verified) as User;
        return { token: jwt, user };
      } catch {
        return null;
      }
    },

    async clear(): Promise<void> {
      const cookieStore = await cookies();
      cookieStore.delete("jwt");
      cookieStore.delete("user");
    },
  };
}

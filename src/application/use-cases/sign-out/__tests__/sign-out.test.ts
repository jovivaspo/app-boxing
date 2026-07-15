import { describe, expect, it, vi } from "vitest";

import type { SessionPort } from "@/application/ports/session.port";

import { signOut } from "../sign-out";

function makeSession(overrides?: Partial<SessionPort>): SessionPort {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("signOut", () => {
  it("clears the session", async () => {
    const session = makeSession();

    await signOut({ session })();

    expect(session.clear).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from clear() without swallowing them", async () => {
    const clearError = new Error("cookie store unavailable");
    const session = makeSession({
      clear: vi.fn().mockRejectedValue(clearError),
    });

    await expect(signOut({ session })()).rejects.toBe(clearError);
  });
});

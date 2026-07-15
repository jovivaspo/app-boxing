import { describe, expect, it, vi } from "vitest";

import type { Session } from "@/domain/session.model";
import type { SessionPort } from "@/application/ports/session.port";

import { getCurrentSession } from "../get-current-session";

const fakeSession: Session = {
  token: "backend-jwt",
  user: {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "boxer",
    pictureUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

function makeSession(overrides?: Partial<SessionPort>): SessionPort {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("getCurrentSession", () => {
  it("returns the session when a valid one exists", async () => {
    const session = makeSession({
      get: vi.fn().mockResolvedValue(fakeSession),
    });

    const result = await getCurrentSession({ session })();

    expect(result).toBe(fakeSession);
  });

  it("returns null when there is no valid session", async () => {
    const session = makeSession({ get: vi.fn().mockResolvedValue(null) });

    const result = await getCurrentSession({ session })();

    expect(result).toBeNull();
  });
});

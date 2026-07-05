import { describe, expect, it } from "vitest";

import type { BackendAuthResponseDto } from "@/infraestructure/auth/dto/backend-auth.dto";

import { toSession, toUser } from "./user.mapper";

function makeDto(
  overrides?: Partial<BackendAuthResponseDto["user"]>
): BackendAuthResponseDto {
  return {
    token: "backend-jwt",
    user: {
      id: "1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "boxer",
      pictureUrl: "https://example.com/pic.png",
      createdAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    },
  };
}

describe("toUser", () => {
  it("maps id, name, email, role, pictureUrl, and createdAt 1:1 when pictureUrl is present", () => {
    const dto = makeDto();

    expect(toUser(dto.user)).toEqual({
      id: "1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "boxer",
      pictureUrl: "https://example.com/pic.png",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("null-coalesces a missing pictureUrl to null", () => {
    const dto = makeDto({ pictureUrl: undefined });

    expect(toUser(dto.user).pictureUrl).toBeNull();
  });

  it("passes through an arbitrary role string without narrowing it", () => {
    const dto = makeDto({ role: "coach" });

    expect(toUser(dto.user).role).toBe("coach");
  });
});

describe("toSession", () => {
  it("wraps the backend token and the mapped user into a Session", () => {
    const dto = makeDto();

    expect(toSession(dto)).toEqual({
      token: "backend-jwt",
      user: toUser(dto.user),
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Characterization/approval test — captures the CURRENT observable behavior
// of the legacy logout route BEFORE it is rewired (Phase 9) to call
// `signOut()`. Do NOT modify `route.ts` to make this pass; it documents
// reality as it exists today so a later PR can prove the rewired
// implementation preserves cookie deletion and the redirect target/status.

const deleteMock = vi.fn();
const cookiesMock = vi.fn().mockResolvedValue({ delete: deleteMock });

vi.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

describe("POST /api/logout (legacy route.ts characterization)", () => {
  afterEach(() => {
    deleteMock.mockClear();
    cookiesMock.mockClear();
  });

  it("deletes the jwt and user cookies and redirects to /login with a 303 status", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost:3000/api/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(deleteMock).toHaveBeenCalledWith("jwt");
    expect(deleteMock).toHaveBeenCalledWith("user");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login"
    );
  });
});

import { describe, expect, it } from "vitest";

import { sign, verify } from "../hmac";

const SECRET = "test-secret-value";

describe("hmac sign/verify", () => {
  it("signs a payload and verifies it back to the original payload", () => {
    const signed = sign("hello world", SECRET);

    expect(verify(signed, SECRET)).toBe("hello world");
  });

  it("produces a different signed value for a different payload (triangulation)", () => {
    const signedA = sign("payload-a", SECRET);
    const signedB = sign("payload-b", SECRET);

    expect(signedA).not.toBe(signedB);
    expect(verify(signedA, SECRET)).toBe("payload-a");
    expect(verify(signedB, SECRET)).toBe("payload-b");
  });

  it("returns null when the signature has been tampered with", () => {
    const signed = sign("hello world", SECRET);
    const [payload] = signed.split(".");
    const tampered = `${payload}.not-a-real-signature`;

    expect(verify(tampered, SECRET)).toBeNull();
  });

  it("returns null when the payload has been tampered with (signature no longer matches)", () => {
    const signed = sign("hello world", SECRET);
    const [, mac] = signed.split(".");
    const tamperedPayload = Buffer.from("goodbye world").toString("base64url");
    const tampered = `${tamperedPayload}.${mac}`;

    expect(verify(tampered, SECRET)).toBeNull();
  });

  it("returns null when verifying with a different secret than the one used to sign", () => {
    const signed = sign("hello world", SECRET);

    expect(verify(signed, "a-different-secret")).toBeNull();
  });

  it("returns null for a malformed value that doesn't have the payload.mac shape", () => {
    expect(verify("not-a-signed-value", SECRET)).toBeNull();
    expect(verify("", SECRET)).toBeNull();
  });
});

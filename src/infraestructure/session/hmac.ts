import { createHmac, timingSafeEqual } from "node:crypto";

export function sign(payload: string, secret: string): string {
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const mac = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${mac}`;
}

export function verify(value: string, secret: string): string | null {
  if (!value) {
    return null;
  }

  const separatorIndex = value.indexOf(".");
  if (separatorIndex === -1) {
    return null;
  }

  const encodedPayload = value.slice(0, separatorIndex);
  const mac = value.slice(separatorIndex + 1);
  if (!encodedPayload || !mac) {
    return null;
  }

  const expectedMac = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  const macBuffer = Buffer.from(mac, "base64url");
  const expectedMacBuffer = Buffer.from(expectedMac, "base64url");
  if (macBuffer.length !== expectedMacBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(macBuffer, expectedMacBuffer)) {
    return null;
  }

  try {
    return Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

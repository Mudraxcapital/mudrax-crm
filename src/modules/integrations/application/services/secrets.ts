// ============================================================================
// src/modules/integrations/application/services/secrets.ts
// ============================================================================

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function secretPrefix(value: string): string {
  return value.slice(0, 8);
}

export function verifySecret(plaintext: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashSecret(plaintext), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Apply field mappings: external payload → normalized Lead Center raw object. */
export function applyFieldMappings(
  payload: Record<string, unknown>,
  mappings: Array<{ externalField: string; internalField: string }>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  for (const mapping of mappings) {
    const value = payload[mapping.externalField];
    if (value === undefined || value === null || value === "") continue;
    out[mapping.internalField] = value;
  }
  return out;
}

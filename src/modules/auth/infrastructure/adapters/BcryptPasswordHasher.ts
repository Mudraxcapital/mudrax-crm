// ============================================================================
// src/modules/auth/infrastructure/adapters/BcryptPasswordHasher.ts
//
// bcrypt-backed PasswordHasher — a modern, adaptive-cost hashing algorithm
// (platform-contracts.md §3), implemented with `bcryptjs` (pure JS, no
// native compilation step) so behavior is identical across the Windows
// host and the Linux/musl Docker container this project runs in.
//
// `verify` also recognizes the legacy `scrypt$<saltHex>$<keyHex>` format
// produced by prisma/seed/lib/security.ts's DEV-ONLY `hashSeedPassword`
// before this module existed — exactly the "self-describing so a future,
// separately-approved Authentication implementation can detect and
// migrate" seam that helper's own doc comment reserved. The seed has since
// been switched to bcrypt directly (see prisma/seed/lib/security.ts), so
// this branch only matters for a database seeded before that change.
// ============================================================================

import bcrypt from "bcryptjs";
import { scryptSync, timingSafeEqual } from "node:crypto";
import type { PasswordHasher } from "../../application/ports/PasswordHasher";

const BCRYPT_COST_FACTOR = 12;

function verifyLegacySeedScrypt(plainTextPassword: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, saltHex, derivedKeyHex] = parts;
  if (!saltHex || !derivedKeyHex) {
    return false;
  }

  const expectedKey = Buffer.from(derivedKeyHex, "hex");
  const actualKey = scryptSync(plainTextPassword, Buffer.from(saltHex, "hex"), expectedKey.length);
  return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey);
}

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, BCRYPT_COST_FACTOR);
  }

  async verify(plainTextPassword: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith("scrypt$")) {
      return verifyLegacySeedScrypt(plainTextPassword, storedHash);
    }
    return bcrypt.compare(plainTextPassword, storedHash);
  }
}

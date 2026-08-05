// ============================================================================
// prisma/seed/lib/security.ts
//
// Seed-only helpers for two pieces of sensitive-data handling this schema
// requires non-null columns for:
//
//   1. Password hashing — now that Authentication is implemented
//      (src/modules/auth), the bootstrap Administrator's passwordHash is
//      produced with the exact same strategy the application verifies
//      against (bcrypt via `bcryptjs` — see
//      src/modules/auth/infrastructure/adapters/BcryptPasswordHasher.ts),
//      so the seeded credential documented in README.md actually
//      authenticates. It is still a DEV-ONLY, publicly-documented fixed
//      password — never use this seed against a non-local environment.
//   2. PAN hashing/masking — platform-contracts.md §3 requires "an
//      irreversible lookup hash for deduplication" for PAN/Aadhaar, backed
//      in production by a real KMS/HSM-backed utility owned by the
//      `customers` module's write path (not yet implemented). This is a
//      seed-only approximation good enough to make demo PAN values behave
//      like real ones (masked by default, deterministically de-duplicable).
//
// `hashSeedPassword` intentionally duplicates BcryptPasswordHasher's cost
// factor instead of importing from src/ — the seed CLI is a separate
// entrypoint (see lib/client.ts's note) and must not depend on application
// runtime code.
// ============================================================================

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_COST_FACTOR = 12;

/**
 * DEV-ONLY password hash for the bootstrap Administrator seed row, hashed
 * with the same bcrypt strategy `src/modules/auth` verifies against. The
 * plaintext (`SEED_ADMIN_PASSWORD` / default in steps/03-admin-user.ts) is a
 * development placeholder — treat it as disposable in any shared environment.
 */
export function hashSeedPassword(plainTextPassword: string): string {
  return bcrypt.hashSync(plainTextPassword, BCRYPT_COST_FACTOR);
}

/**
 * Deterministic, irreversible lookup hash for a PAN-shaped identifier,
 * matching the *purpose* `customers.CustomerIdentifier.valueHash` documents
 * ("deterministic-match hash... never displayed or decrypted"). Two demo
 * rows seeded with the same raw PAN would collide on this hash exactly as
 * two real Customers sharing a PAN should.
 */
export function hashIdentifierValue(rawValue: string): string {
  return createHash("sha256").update(rawValue.trim().toUpperCase()).digest("hex");
}

/** Masked PAN display value: keeps only the last 4 characters visible. */
export function maskPan(pan: string): string {
  return `${"X".repeat(Math.max(pan.length - 4, 0))}${pan.slice(-4)}`;
}

/** Masked phone display value: keeps only the last 4 digits visible. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${"X".repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
}

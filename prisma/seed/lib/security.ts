// ============================================================================
// prisma/seed/lib/security.ts
//
// Seed-only, deliberately minimal stand-ins for two pieces of sensitive-data
// handling this schema requires non-null columns for, but that this task
// explicitly does not implement:
//
//   1. Password hashing — Authentication is out of scope for this task ("wait
//      for approval before implementing Authentication"). `users.User.
//      passwordHash` is a required column, so the bootstrap Administrator
//      row needs *some* value; `hashSeedPassword` produces one using only
//      Node's built-in `crypto` (no bcrypt/argon2 dependency pulled in on
//      the strength of a seed script), clearly namespaced so it is
//      unmistakably not a production authentication implementation.
//   2. PAN hashing/masking — platform-contracts.md §3 requires "an
//      irreversible lookup hash for deduplication" for PAN/Aadhaar, backed
//      in production by a real KMS/HSM-backed utility owned by the
//      `customers` module's write path (not yet implemented). This is a
//      seed-only approximation good enough to make demo PAN values behave
//      like real ones (masked by default, deterministically de-duplicable).
//
// Neither helper is imported by anything under src/ — they exist only to
// satisfy this database layer's NOT NULL constraints with realistic-looking
// values, never as production security infrastructure.
// ============================================================================

import { createHash, randomBytes, scryptSync } from "node:crypto";

/**
 * DEV-ONLY password hash for the bootstrap Administrator seed row.
 *
 * Format: `scrypt$<saltHex>$<derivedKeyHex>` — self-describing so a future,
 * separately-approved Authentication implementation can detect and migrate
 * (or simply discard) any row still carrying this format. Every seeded
 * value must be treated as disposable and rotated the moment real
 * Authentication ships.
 */
export function hashSeedPassword(plainTextPassword: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(plainTextPassword, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
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

// ============================================================================
// prisma/seed/lib/determinism.ts
//
// Deterministic id generation for demo/sample rows that have no natural
// business unique key to `upsert` on (Customer, CustomerIdentifier, Lead,
// FollowUp, LoanApplication, ...). Everything else in this seed upserts on
// a real unique constraint already present in the schema (organizationId +
// code/name, a compound primary key, etc.); this helper exists only to make
// the *remaining* handful of models idempotent too, per requirement #6
// ("ensure seed scripts are idempotent").
// ============================================================================

import { createHash } from "node:crypto";

/**
 * Fixed, arbitrary namespace UUID for every id `seedId()` generates (RFC
 * 4122 UUIDv5). Never reused for anything else, and never changed — changing
 * it would silently mint new ids for the same logical demo row on the next
 * run, breaking idempotency for every downstream reference to that id.
 */
const SEED_NAMESPACE = "8f14e45f-ceea-467e-9de1-c6a1a3f9c8ab";

/**
 * Deterministic UUIDv5 generator (standard algorithm: SHA-1 of
 * namespace + name, with the version/variant bits patched in) implemented
 * with Node's built-in `crypto` module rather than adding a `uuid`
 * dependency for one helper function.
 *
 * Calling `seedId("lead:rahul-sharma")` always returns the same UUID, so
 * `prisma.lead.upsert({ where: { id: seedId(...) }, ... })` is a safe,
 * idempotent no-op on every re-run instead of inserting a duplicate row.
 */
export function seedId(name: string): string {
  const namespaceBytes = Buffer.from(SEED_NAMESPACE.replace(/-/g, ""), "hex");
  const nameBytes = Buffer.from(name, "utf8");
  const hash = createHash("sha1")
    .update(Buffer.concat([namespaceBytes, nameBytes]))
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50; // version 5
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

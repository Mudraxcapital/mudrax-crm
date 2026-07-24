// ============================================================================
// src/modules/customers/domain/services/identifierMatching.ts
//
// Pure, framework-free identity-matching helpers (customers.md): PAN/Aadhaar
// use a deterministic, irreversible lookup hash for cross-Customer
// uniqueness matching (platform-contracts.md §3); Phone/Email use a
// normalized value for probabilistic matching only, never a hash. Mirrors
// prisma/seed/lib/security.ts's approach exactly so seed-created and
// application-created identifiers hash identically.
// ============================================================================

import { createHash } from "node:crypto";
import type { IdentifierType } from "../entities/CustomerIdentifier";
import { isStrongIdentifierType } from "../entities/CustomerIdentifier";

/** Deterministic, irreversible lookup hash — never displayed or decrypted. */
export function hashIdentifierValue(rawValue: string): string {
  return createHash("sha256").update(rawValue.trim().toUpperCase()).digest("hex");
}

function maskKeepingLast(value: string, keep: number): string {
  return `${"X".repeat(Math.max(value.length - keep, 0))}${value.slice(-keep)}`;
}

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, "");
}

function maskEmail(value: string): string {
  return value.replace(/^(.{2}).*(@.*)$/, "$1***$2");
}

export interface PreparedIdentifier {
  type: IdentifierType;
  /** Populated only for PAN/AADHAAR — the deterministic matching key. */
  valueHash: string | null;
  /** Populated only for PHONE/EMAIL — the probabilistic matching key. */
  valueNormalized: string | null;
  valueMasked: string;
}

/** Normalizes a raw identifier value into its storable, never-plaintext form. */
export function prepareIdentifier(type: IdentifierType, rawValue: string): PreparedIdentifier {
  const trimmed = rawValue.trim();

  if (type === "PAN") {
    const upper = trimmed.toUpperCase();
    return {
      type,
      valueHash: hashIdentifierValue(upper),
      valueNormalized: null,
      valueMasked: maskKeepingLast(upper, 4),
    };
  }

  if (type === "AADHAAR") {
    const digits = trimmed.replace(/\s/g, "");
    return {
      type,
      valueHash: hashIdentifierValue(digits),
      valueNormalized: null,
      valueMasked: maskKeepingLast(digits, 4),
    };
  }

  if (type === "PHONE") {
    const normalized = normalizePhone(trimmed);
    return {
      type,
      valueHash: null,
      valueNormalized: normalized,
      valueMasked: maskKeepingLast(normalized.replace(/\D/g, ""), 4),
    };
  }

  const normalized = trimmed.toLowerCase();
  return { type, valueHash: null, valueNormalized: normalized, valueMasked: maskEmail(normalized) };
}

/** Identity Confidence tier from the set of Identifiers a Customer currently holds (customers.md: computed automatically). Real KYC-backed VERIFIED upgrades are a future, out-of-scope hook. */
export function computeIdentityConfidence(
  identifierTypes: IdentifierType[],
): "UNVERIFIED" | "DECLARED" {
  return identifierTypes.some((type) => isStrongIdentifierType(type)) ? "DECLARED" : "UNVERIFIED";
}

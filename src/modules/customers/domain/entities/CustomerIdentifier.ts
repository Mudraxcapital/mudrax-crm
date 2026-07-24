// ============================================================================
// src/modules/customers/domain/entities/CustomerIdentifier.ts
//
// One identity/contact proof held by a Customer: PAN, Aadhaar, Phone, or
// Email (customers.md). PAN/Aadhaar are the strong, deterministic-match
// anchors (`valueHash` populated); Phone/Email are probabilistic-match-only
// (`valueNormalized` populated, `valueHash` always null).
// ============================================================================

export const IDENTIFIER_TYPES = ["PAN", "AADHAAR", "PHONE", "EMAIL"] as const;
export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const IDENTIFIER_STATUSES = ["ACTIVE", "SUPERSEDED"] as const;
export type IdentifierStatus = (typeof IDENTIFIER_STATUSES)[number];

export interface CustomerIdentifier {
  id: string;
  customerId: string;
  type: IdentifierType;
  valueHash: string | null;
  valueNormalized: string | null;
  valueMasked: string;
  status: IdentifierStatus;
  verifiedAt: Date | null;
  verificationSource: string | null;
  supersededByIdentifierId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The strong, cross-Customer-unique anchor types (customers.md). */
export function isStrongIdentifierType(type: IdentifierType): boolean {
  return type === "PAN" || type === "AADHAAR";
}

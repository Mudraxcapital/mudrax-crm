// ============================================================================
// src/modules/customers/domain/entities/Customer.ts
//
// The identity aggregate root (customers.md — "Customers Bounded Context").
// Identity is resolved from a weighted set of Customer Identifiers rather
// than any single mutable contact field. Framework-free: no Prisma types
// leak past the infrastructure/mappers layer.
// ============================================================================

export const IDENTITY_CONFIDENCE_LEVELS = ["UNVERIFIED", "DECLARED", "VERIFIED"] as const;
export type IdentityConfidence = (typeof IDENTITY_CONFIDENCE_LEVELS)[number];

export const CUSTOMER_STATUSES = ["ACTIVE", "MERGED", "ARCHIVED"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface Customer {
  id: string;
  organizationId: string;
  fullName: string;
  dob: Date | null;
  identityConfidence: IdentityConfidence;
  status: CustomerStatus;
  mergedIntoCustomerId: string | null;
  ownerManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

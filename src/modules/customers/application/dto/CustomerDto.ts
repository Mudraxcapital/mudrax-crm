// ============================================================================
// src/modules/customers/application/dto/CustomerDto.ts
//
// What the Customer aggregate's use-cases return to the presentation layer —
// a plain, serializable shape (dates as ISO strings). Identifiers are always
// exposed via their masked display value only — the raw PAN/Aadhaar/Phone/
// Email value never leaves the infrastructure layer (platform-contracts.md
// §3 "masked by default").
// ============================================================================

import type { Customer } from "../../domain/entities/Customer";
import type { CustomerIdentifier } from "../../domain/entities/CustomerIdentifier";
import type { CustomerWithIdentifiers } from "../../domain/repositories/CustomerRepository";

export interface CustomerIdentifierDto {
  id: string;
  type: CustomerIdentifier["type"];
  valueMasked: string;
  status: CustomerIdentifier["status"];
  verifiedAt: string | null;
}

export interface CustomerDto {
  id: string;
  organizationId: string;
  fullName: string;
  dob: string | null;
  identityConfidence: Customer["identityConfidence"];
  status: Customer["status"];
  mergedIntoCustomerId: string | null;
  ownerManagerId: string | null;
  identifiers: CustomerIdentifierDto[];
  createdAt: string;
  updatedAt: string;
}

function toCustomerIdentifierDto(identifier: CustomerIdentifier): CustomerIdentifierDto {
  return {
    id: identifier.id,
    type: identifier.type,
    valueMasked: identifier.valueMasked,
    status: identifier.status,
    verifiedAt: identifier.verifiedAt ? identifier.verifiedAt.toISOString() : null,
  };
}

export function toCustomerDto(input: CustomerWithIdentifiers): CustomerDto {
  const { customer, identifiers } = input;
  return {
    id: customer.id,
    organizationId: customer.organizationId,
    fullName: customer.fullName,
    dob: customer.dob ? customer.dob.toISOString().slice(0, 10) : null,
    identityConfidence: customer.identityConfidence,
    status: customer.status,
    mergedIntoCustomerId: customer.mergedIntoCustomerId,
    ownerManagerId: customer.ownerManagerId,
    identifiers: identifiers.map(toCustomerIdentifierDto),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

/** Lightweight projection for list views/reference pickers (Lead creation, Lead list) — no identifiers. */
export interface CustomerSummaryDto {
  id: string;
  fullName: string;
  status: Customer["status"];
  identityConfidence: Customer["identityConfidence"];
  createdAt: string;
}

export function toCustomerSummaryDto(customer: Customer): CustomerSummaryDto {
  return {
    id: customer.id,
    fullName: customer.fullName,
    status: customer.status,
    identityConfidence: customer.identityConfidence,
    createdAt: customer.createdAt.toISOString(),
  };
}

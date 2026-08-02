/**
 * Serializable Customer contract (mirrors CustomerDto from the web CRM).
 * Identifier values are always masked — never raw PAN/Aadhaar/Phone/Email.
 */

export type IdentityConfidence = "UNVERIFIED" | "DECLARED" | "VERIFIED";
export type CustomerStatus = "ACTIVE" | "MERGED" | "ARCHIVED";
export type IdentifierType = "PAN" | "AADHAAR" | "PHONE" | "EMAIL";
export type IdentifierStatus = "ACTIVE" | "SUPERSEDED";

export interface CustomerIdentifier {
  id: string;
  type: IdentifierType;
  valueMasked: string;
  status: IdentifierStatus;
  verifiedAt: string | null;
}

export interface Customer {
  id: string;
  organizationId: string;
  fullName: string;
  /** YYYY-MM-DD or null */
  dob: string | null;
  identityConfidence: IdentityConfidence;
  status: CustomerStatus;
  mergedIntoCustomerId: string | null;
  ownerManagerId: string | null;
  identifiers: CustomerIdentifier[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  fullName: string;
  status: CustomerStatus;
  identityConfidence: IdentityConfidence;
  createdAt: string;
}

export interface CustomerListResponse {
  data: Customer[];
  meta?: {
    limit?: number;
    offset?: number;
  };
}

export interface CustomerResponse {
  data: Customer;
}

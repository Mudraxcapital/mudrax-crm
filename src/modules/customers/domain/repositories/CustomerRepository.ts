// ============================================================================
// src/modules/customers/domain/repositories/CustomerRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaCustomerRepository.
// ============================================================================

import type { Customer, CustomerStatus } from "../entities/Customer";
import type { CustomerIdentifier, IdentifierType } from "../entities/CustomerIdentifier";
import type { CustomerAuditActor, CustomerAuditRecord } from "../entities/CustomerAuditRecord";
import type {
  CustomerDuplicateCandidate,
  CustomerMerge,
  DuplicateCandidateStatus,
  DuplicateMatchType,
} from "../entities/CustomerDuplicateCandidate";

export interface CreateIdentifierData {
  type: IdentifierType;
  valueHash: string | null;
  valueNormalized: string | null;
  valueMasked: string;
  verifiedAt?: Date | null;
  verificationSource?: string | null;
}

export interface CreateCustomerData {
  organizationId: string;
  fullName: string;
  dob?: Date | null;
  ownerManagerId?: string | null;
  identifiers: CreateIdentifierData[];
}

export interface UpdateCustomerData {
  fullName?: string;
  dob?: Date | null;
  status?: CustomerStatus;
}

export interface CustomerWithIdentifiers {
  customer: Customer;
  identifiers: CustomerIdentifier[];
}

export interface ListCustomersOptions {
  search?: string;
  ownerManagerId?: string;
  /** Restrict to an explicit Customer id set (Team Lead hierarchy visibility). */
  customerIds?: string[];
  limit?: number;
  offset?: number;
}

export interface CreateDuplicateCandidateData {
  customerAId: string;
  customerBId: string;
  matchType: DuplicateMatchType;
  matchScore?: number | null;
}

export interface MergeCustomersData {
  survivingCustomerId: string;
  mergedAwayCustomerId: string;
  duplicateCandidateId?: string | null;
  mergedByUserId: string;
  reason?: string | null;
}

export interface CustomerRepository {
  findById(id: string): Promise<CustomerWithIdentifiers | null>;

  /** Deterministic PAN/Aadhaar duplicate lookup — same hash within the same Organization identifies the same real person (customers.md). */
  findByIdentifierHash(
    organizationId: string,
    type: IdentifierType,
    valueHash: string,
  ): Promise<Customer | null>;

  /** Probabilistic PHONE/EMAIL lookup (non-unique). */
  listByNormalizedIdentifier(
    organizationId: string,
    type: IdentifierType,
    valueNormalized: string,
  ): Promise<CustomerWithIdentifiers[]>;

  list(organizationId: string, options?: ListCustomersOptions): Promise<Customer[]>;
  listWithIdentifiers(
    organizationId: string,
    options?: ListCustomersOptions,
  ): Promise<CustomerWithIdentifiers[]>;
  count(organizationId: string, options?: Pick<ListCustomersOptions, "ownerManagerId" | "customerIds">): Promise<number>;

  /** Creates the Customer, its Identifiers, and a "created" Audit Record atomically. */
  createWithAudit(
    data: CreateCustomerData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<CustomerWithIdentifiers>;

  /** Updates the Customer and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateCustomerData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<CustomerWithIdentifiers>;

  findDuplicateCandidate(id: string): Promise<CustomerDuplicateCandidate | null>;
  listDuplicateCandidates(
    organizationId: string,
    status?: DuplicateCandidateStatus,
  ): Promise<CustomerDuplicateCandidate[]>;
  findDuplicatePair(
    customerAId: string,
    customerBId: string,
  ): Promise<CustomerDuplicateCandidate | null>;
  createDuplicateCandidate(
    data: CreateDuplicateCandidateData,
  ): Promise<CustomerDuplicateCandidate>;
  updateDuplicateCandidateStatus(
    id: string,
    status: DuplicateCandidateStatus,
    reviewedByUserId: string | null,
  ): Promise<CustomerDuplicateCandidate>;

  /**
   * Customer Merge — survivor inherits identifiers; merged-away becomes MERGED
   * tombstone with redirect (customers.md). Atomic with audit.
   */
  mergeWithAudit(
    data: MergeCustomersData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<{ survivor: CustomerWithIdentifiers; merge: CustomerMerge }>;

  /** Read-only Audit Trail access, scoped to one Customer (platform-contracts.md §4). */
  listAuditLog(customerId: string): Promise<CustomerAuditRecord[]>;
}

// ============================================================================
// src/modules/customers/domain/repositories/CustomerRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaCustomerRepository.
// ============================================================================

import type { Customer, CustomerStatus } from "../entities/Customer";
import type { CustomerIdentifier, IdentifierType } from "../entities/CustomerIdentifier";
import type { CustomerAuditActor, CustomerAuditRecord } from "../entities/CustomerAuditRecord";

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
  limit?: number;
  offset?: number;
}

export interface CustomerRepository {
  findById(id: string): Promise<CustomerWithIdentifiers | null>;

  /** Deterministic PAN/Aadhaar duplicate lookup — same hash within the same Organization identifies the same real person (customers.md). */
  findByIdentifierHash(
    organizationId: string,
    type: IdentifierType,
    valueHash: string,
  ): Promise<Customer | null>;

  list(organizationId: string, options?: ListCustomersOptions): Promise<Customer[]>;
  count(organizationId: string): Promise<number>;

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

  /** Read-only Audit Trail access, scoped to one Customer (platform-contracts.md §4). */
  listAuditLog(customerId: string): Promise<CustomerAuditRecord[]>;
}

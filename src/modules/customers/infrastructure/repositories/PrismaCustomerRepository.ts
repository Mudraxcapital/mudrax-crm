// ============================================================================
// src/modules/customers/infrastructure/repositories/PrismaCustomerRepository.ts
//
// Prisma-backed implementation of CustomerRepository. `createWithAudit`/
// `updateWithAudit` write the Customer (+ Identifiers) row and its Audit
// Record inside one `$transaction`. Audit Records live in
// `customers.customer_audit_log`, distinguished by `targetType = "Customer"`
// — see PrismaTeamRepository.ts's identical pattern in `organization`.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateCustomerData,
  CustomerRepository,
  CustomerWithIdentifiers,
  ListCustomersOptions,
  UpdateCustomerData,
} from "../../domain/repositories/CustomerRepository";
import type { Customer } from "../../domain/entities/Customer";
import type { IdentifierType } from "../../domain/entities/CustomerIdentifier";
import type {
  CustomerAuditActor,
  CustomerAuditRecord,
} from "../../domain/entities/CustomerAuditRecord";
import { isStrongIdentifierType } from "../../domain/entities/CustomerIdentifier";
import { toCustomer, toCustomerAuditRecord, toCustomerIdentifier } from "../mappers/customerMapper";

const TARGET_TYPE_CUSTOMER = "Customer";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the identical comment in PrismaTeamRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(customer: Customer): Prisma.InputJsonValue {
  return {
    id: customer.id,
    organizationId: customer.organizationId,
    fullName: customer.fullName,
    identityConfidence: customer.identityConfidence,
    status: customer.status,
  };
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CustomerWithIdentifiers | null> {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      include: { identifiers: { orderBy: { createdAt: "asc" } } },
    });
    if (!row) return null;
    return { customer: toCustomer(row), identifiers: row.identifiers.map(toCustomerIdentifier) };
  }

  async findByIdentifierHash(
    organizationId: string,
    type: IdentifierType,
    valueHash: string,
  ): Promise<Customer | null> {
    const identifier = await this.prisma.customerIdentifier.findFirst({
      where: { type, valueHash, customer: { organizationId } },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
    });
    return identifier ? toCustomer(identifier.customer) : null;
  }

  async list(organizationId: string, options?: ListCustomersOptions): Promise<Customer[]> {
    const where: Prisma.CustomerWhereInput = { organizationId };
    if (options?.search) {
      where.fullName = { contains: options.search, mode: "insensitive" };
    }

    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
    return rows.map(toCustomer);
  }

  async count(organizationId: string): Promise<number> {
    return this.prisma.customer.count({ where: { organizationId } });
  }

  async createWithAudit(
    data: CreateCustomerData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<CustomerWithIdentifiers> {
    return this.prisma.$transaction(async (tx) => {
      const identityConfidence = data.identifiers.some((identifier) =>
        isStrongIdentifierType(identifier.type),
      )
        ? "DECLARED"
        : "UNVERIFIED";

      const customerRow = await tx.customer.create({
        data: {
          organizationId: data.organizationId,
          fullName: data.fullName,
          dob: data.dob ?? null,
          identityConfidence,
        },
      });

      const identifierRows = [];
      for (const identifier of data.identifiers) {
        const identifierRow = await tx.customerIdentifier.create({
          data: {
            customerId: customerRow.id,
            type: identifier.type,
            valueHash: identifier.valueHash,
            valueNormalized: identifier.valueNormalized,
            valueMasked: identifier.valueMasked,
            verifiedAt: identifier.verifiedAt ?? null,
            verificationSource: identifier.verificationSource ?? null,
          },
        });
        identifierRows.push(identifierRow);
      }

      const customer = toCustomer(customerRow);

      await tx.customerAuditLog.create({
        data: {
          organizationId: customer.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CustomerCreated",
          targetType: TARGET_TYPE_CUSTOMER,
          targetId: customer.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(customer),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return { customer, identifiers: identifierRows.map(toCustomerIdentifier) };
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateCustomerData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<CustomerWithIdentifiers> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.customer.findUniqueOrThrow({
        where: { id },
        include: { identifiers: { orderBy: { createdAt: "asc" } } },
      });
      const before = toCustomer(beforeRow);

      const afterRow = await tx.customer.update({
        where: { id },
        data: {
          fullName: data.fullName,
          dob: data.dob,
          status: data.status,
        },
        include: { identifiers: { orderBy: { createdAt: "asc" } } },
      });
      const after = toCustomer(afterRow);

      await tx.customerAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CustomerUpdated",
          targetType: TARGET_TYPE_CUSTOMER,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return { customer: after, identifiers: afterRow.identifiers.map(toCustomerIdentifier) };
    });
  }

  async listAuditLog(customerId: string): Promise<CustomerAuditRecord[]> {
    const rows = await this.prisma.customerAuditLog.findMany({
      where: { targetType: TARGET_TYPE_CUSTOMER, targetId: customerId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toCustomerAuditRecord);
  }
}

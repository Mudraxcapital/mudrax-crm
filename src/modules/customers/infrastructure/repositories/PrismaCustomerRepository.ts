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
  CreateDuplicateCandidateData,
  CustomerRepository,
  CustomerWithIdentifiers,
  ListCustomersOptions,
  MergeCustomersData,
  UpdateCustomerData,
} from "../../domain/repositories/CustomerRepository";
import type { Customer } from "../../domain/entities/Customer";
import type { IdentifierType } from "../../domain/entities/CustomerIdentifier";
import type {
  CustomerAuditActor,
  CustomerAuditRecord,
} from "../../domain/entities/CustomerAuditRecord";
import type {
  CustomerDuplicateCandidate,
  CustomerMerge,
  DuplicateCandidateStatus,
} from "../../domain/entities/CustomerDuplicateCandidate";
import { isStrongIdentifierType } from "../../domain/entities/CustomerIdentifier";
import {
  toCustomer,
  toCustomerAuditRecord,
  toCustomerIdentifier,
  toCustomerMerge,
  toDuplicateCandidate,
} from "../mappers/customerMapper";

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

  async listByNormalizedIdentifier(
    organizationId: string,
    type: IdentifierType,
    valueNormalized: string,
  ): Promise<CustomerWithIdentifiers[]> {
    const identifiers = await this.prisma.customerIdentifier.findMany({
      where: {
        type,
        valueNormalized,
        status: "ACTIVE",
        customer: { organizationId, status: "ACTIVE" },
      },
      include: { customer: { include: { identifiers: { orderBy: { createdAt: "asc" } } } } },
    });
    const byCustomer = new Map<string, CustomerWithIdentifiers>();
    for (const identifier of identifiers) {
      byCustomer.set(identifier.customerId, {
        customer: toCustomer(identifier.customer),
        identifiers: identifier.customer.identifiers.map(toCustomerIdentifier),
      });
    }
    return [...byCustomer.values()];
  }

  async list(organizationId: string, options?: ListCustomersOptions): Promise<Customer[]> {
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      status: { not: "MERGED" },
    };
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

  async listWithIdentifiers(
    organizationId: string,
    options?: ListCustomersOptions,
  ): Promise<CustomerWithIdentifiers[]> {
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      status: { not: "MERGED" },
    };
    if (options?.search) {
      where.fullName = { contains: options.search, mode: "insensitive" };
    }

    const rows = await this.prisma.customer.findMany({
      where,
      include: { identifiers: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 200,
      skip: options?.offset ?? 0,
    });
    return rows.map((row) => ({
      customer: toCustomer(row),
      identifiers: row.identifiers.map(toCustomerIdentifier),
    }));
  }

  async count(organizationId: string): Promise<number> {
    return this.prisma.customer.count({
      where: { organizationId, status: { not: "MERGED" } },
    });
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

  async findDuplicateCandidate(id: string): Promise<CustomerDuplicateCandidate | null> {
    const row = await this.prisma.customerDuplicateCandidate.findUnique({ where: { id } });
    return row ? toDuplicateCandidate(row) : null;
  }

  async listDuplicateCandidates(
    organizationId: string,
    status?: DuplicateCandidateStatus,
  ): Promise<CustomerDuplicateCandidate[]> {
    const rows = await this.prisma.customerDuplicateCandidate.findMany({
      where: {
        ...(status ? { status } : {}),
        customerA: { organizationId },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDuplicateCandidate);
  }

  async findDuplicatePair(
    customerAId: string,
    customerBId: string,
  ): Promise<CustomerDuplicateCandidate | null> {
    const [a, b] = customerAId < customerBId ? [customerAId, customerBId] : [customerBId, customerAId];
    const row = await this.prisma.customerDuplicateCandidate.findUnique({
      where: { customerAId_customerBId: { customerAId: a, customerBId: b } },
    });
    return row ? toDuplicateCandidate(row) : null;
  }

  async createDuplicateCandidate(
    data: CreateDuplicateCandidateData,
  ): Promise<CustomerDuplicateCandidate> {
    const [a, b] =
      data.customerAId < data.customerBId
        ? [data.customerAId, data.customerBId]
        : [data.customerBId, data.customerAId];
    const row = await this.prisma.customerDuplicateCandidate.create({
      data: {
        customerAId: a,
        customerBId: b,
        matchType: data.matchType,
        matchScore: data.matchScore ?? null,
      },
    });
    return toDuplicateCandidate(row);
  }

  async updateDuplicateCandidateStatus(
    id: string,
    status: DuplicateCandidateStatus,
    reviewedByUserId: string | null,
  ): Promise<CustomerDuplicateCandidate> {
    const row = await this.prisma.customerDuplicateCandidate.update({
      where: { id },
      data: {
        status,
        reviewedByUserId,
        reviewedAt: new Date(),
      },
    });
    return toDuplicateCandidate(row);
  }

  async mergeWithAudit(
    data: MergeCustomersData,
    actor: CustomerAuditActor,
    correlationId?: string | null,
  ): Promise<{ survivor: CustomerWithIdentifiers; merge: CustomerMerge }> {
    return this.prisma.$transaction(async (tx) => {
      const survivorRow = await tx.customer.findUniqueOrThrow({
        where: { id: data.survivingCustomerId },
        include: { identifiers: { orderBy: { createdAt: "asc" } } },
      });
      const mergedAwayRow = await tx.customer.findUniqueOrThrow({
        where: { id: data.mergedAwayCustomerId },
        include: { identifiers: { orderBy: { createdAt: "asc" } } },
      });

      const beforeSurvivor = toCustomer(survivorRow);
      const beforeMergedAway = toCustomer(mergedAwayRow);

      for (const identifier of mergedAwayRow.identifiers) {
        if (identifier.status !== "ACTIVE") continue;
        const already = survivorRow.identifiers.some(
          (existing) =>
            existing.type === identifier.type &&
            ((identifier.valueHash && existing.valueHash === identifier.valueHash) ||
              (identifier.valueNormalized &&
                existing.valueNormalized === identifier.valueNormalized)),
        );
        if (already) {
          await tx.customerIdentifier.update({
            where: { id: identifier.id },
            data: { status: "SUPERSEDED" },
          });
          continue;
        }
        await tx.customerIdentifier.update({
          where: { id: identifier.id },
          data: { customerId: data.survivingCustomerId },
        });
      }

      await tx.customer.update({
        where: { id: data.mergedAwayCustomerId },
        data: {
          status: "MERGED",
          mergedIntoCustomerId: data.survivingCustomerId,
        },
      });

      const mergeRow = await tx.customerMerge.create({
        data: {
          survivingCustomerId: data.survivingCustomerId,
          mergedAwayCustomerId: data.mergedAwayCustomerId,
          duplicateCandidateId: data.duplicateCandidateId ?? null,
          mergedByUserId: data.mergedByUserId,
          reason: data.reason ?? null,
        },
      });

      if (data.duplicateCandidateId) {
        await tx.customerDuplicateCandidate.update({
          where: { id: data.duplicateCandidateId },
          data: {
            status: "MERGED",
            reviewedByUserId: data.mergedByUserId,
            reviewedAt: new Date(),
          },
        });
      }

      const survivorAfter = await tx.customer.findUniqueOrThrow({
        where: { id: data.survivingCustomerId },
        include: { identifiers: { orderBy: { createdAt: "asc" } } },
      });
      const survivor = toCustomer(survivorAfter);

      await tx.customerAuditLog.create({
        data: {
          organizationId: survivor.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CustomerMerged",
          targetType: TARGET_TYPE_CUSTOMER,
          targetId: survivor.id,
          correlationId: correlationId ?? data.mergedAwayCustomerId,
          beforeState: {
            survivor: toAuditJson(beforeSurvivor),
            mergedAway: toAuditJson(beforeMergedAway),
          },
          afterState: {
            survivor: toAuditJson(survivor),
            mergedAwayCustomerId: data.mergedAwayCustomerId,
            mergeId: mergeRow.id,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return {
        survivor: {
          customer: survivor,
          identifiers: survivorAfter.identifiers.map(toCustomerIdentifier),
        },
        merge: toCustomerMerge(mergeRow),
      };
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

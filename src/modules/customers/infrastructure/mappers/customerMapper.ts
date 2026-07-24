// ============================================================================
// src/modules/customers/infrastructure/mappers/customerMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated Customer/CustomerIdentifier/
// CustomerAuditLog shapes.
// ============================================================================

import type {
  Customer as PrismaCustomer,
  CustomerIdentifier as PrismaCustomerIdentifier,
  CustomerAuditLog as PrismaCustomerAuditLog,
  CustomerDuplicateCandidate as PrismaDuplicateCandidate,
  CustomerMerge as PrismaCustomerMerge,
} from "@prisma/client";
import type { Customer } from "../../domain/entities/Customer";
import type { CustomerIdentifier } from "../../domain/entities/CustomerIdentifier";
import type { CustomerAuditRecord } from "../../domain/entities/CustomerAuditRecord";
import type {
  CustomerDuplicateCandidate,
  CustomerMerge,
} from "../../domain/entities/CustomerDuplicateCandidate";

export function toCustomer(row: PrismaCustomer): Customer {
  return {
    id: row.id,
    organizationId: row.organizationId,
    fullName: row.fullName,
    dob: row.dob,
    identityConfidence: row.identityConfidence,
    status: row.status,
    mergedIntoCustomerId: row.mergedIntoCustomerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCustomerIdentifier(row: PrismaCustomerIdentifier): CustomerIdentifier {
  return {
    id: row.id,
    customerId: row.customerId,
    type: row.type,
    valueHash: row.valueHash,
    valueNormalized: row.valueNormalized,
    valueMasked: row.valueMasked,
    status: row.status,
    verifiedAt: row.verifiedAt,
    verificationSource: row.verificationSource,
    supersededByIdentifierId: row.supersededByIdentifierId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCustomerAuditRecord(row: PrismaCustomerAuditLog): CustomerAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: row.beforeState as Record<string, unknown> | null,
    afterState: row.afterState as Record<string, unknown> | null,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}

export function toDuplicateCandidate(row: PrismaDuplicateCandidate): CustomerDuplicateCandidate {
  return {
    id: row.id,
    customerAId: row.customerAId,
    customerBId: row.customerBId,
    matchType: row.matchType,
    matchScore: row.matchScore === null ? null : Number(row.matchScore),
    status: row.status,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCustomerMerge(row: PrismaCustomerMerge): CustomerMerge {
  return {
    id: row.id,
    survivingCustomerId: row.survivingCustomerId,
    mergedAwayCustomerId: row.mergedAwayCustomerId,
    duplicateCandidateId: row.duplicateCandidateId,
    mergedByUserId: row.mergedByUserId,
    reason: row.reason,
    mergedAt: row.mergedAt,
  };
}

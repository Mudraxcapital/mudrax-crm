import type {
  Bank as PrismaBank,
  BankBranch as PrismaBankBranch,
  CommissionPolicyVersion as PrismaCommissionPolicyVersion,
  BankAuditLog as PrismaBankAuditLog,
} from "@prisma/client";
import type { Bank } from "../../domain/entities/Bank";
import type { BankBranch } from "../../domain/entities/BankBranch";
import type { CommissionPolicyVersion } from "../../domain/entities/CommissionPolicyVersion";
import type { BanksAuditRecord } from "../../domain/entities/BanksAuditRecord";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function toBank(row: PrismaBank): Bank {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    code: row.code,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toBankBranch(row: PrismaBankBranch): BankBranch {
  return {
    id: row.id,
    bankId: row.bankId,
    name: row.name,
    code: row.code,
    address: row.address,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCommissionPolicyVersion(
  row: PrismaCommissionPolicyVersion,
): CommissionPolicyVersion {
  return {
    id: row.id,
    bankId: row.bankId,
    loanProductId: row.loanProductId,
    versionNumber: row.versionNumber,
    status: row.status,
    rateStructure: asRecord(row.rateStructure) ?? {},
    clawbackWindowDays: row.clawbackWindowDays,
    clawbackRule: asRecord(row.clawbackRule),
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  };
}

export function toBanksAuditRecord(row: PrismaBankAuditLog): BanksAuditRecord {
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
    beforeState: asRecord(row.beforeState),
    afterState: asRecord(row.afterState),
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}

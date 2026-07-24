import type {
  Disbursement as PrismaDisbursement,
  Commission as PrismaCommission,
  DisbursementAuditLog as PrismaAudit,
} from "@prisma/client";
import type { Disbursement } from "../../domain/entities/Disbursement";
import type { Commission } from "../../domain/entities/Commission";
import type { DisbursementsAuditRecord } from "../../domain/entities/DisbursementsAuditRecord";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

export function toDisbursement(row: PrismaDisbursement): Disbursement {
  return {
    id: row.id,
    organizationId: row.organizationId,
    loanApplicationId: row.loanApplicationId,
    loanAccountId: row.loanAccountId,
    bankId: row.bankId,
    status: row.status,
    bankReferenceNumber: row.bankReferenceNumber,
    amount: row.amount.toString(),
    trancheNumber: row.trancheNumber,
    scheduledAt: row.scheduledAt,
    disbursedAt: row.disbursedAt,
    reconciledAt: row.reconciledAt,
    reversedAt: row.reversedAt,
    reversalReason: row.reversalReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCommission(row: PrismaCommission): Commission {
  return {
    id: row.id,
    disbursementId: row.disbursementId,
    commissionPolicyVersionId: row.commissionPolicyVersionId,
    status: row.status,
    rateSnapshot: asRecord(row.rateSnapshot) ?? {},
    computedAmount: row.computedAmount.toString(),
    clawbackRuleSnapshot: asRecord(row.clawbackRuleSnapshot) ?? {},
    invoicedAt: row.invoicedAt,
    receivedAt: row.receivedAt,
    reconciledAt: row.reconciledAt,
    clawbackAmount: row.clawbackAmount?.toString() ?? null,
    clawbackAt: row.clawbackAt,
    clawbackReason: row.clawbackReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toDisbursementsAuditRecord(row: PrismaAudit): DisbursementsAuditRecord {
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

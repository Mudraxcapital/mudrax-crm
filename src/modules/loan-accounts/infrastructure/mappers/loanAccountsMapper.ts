import type {
  LoanAccount as PrismaAccount,
  LoanStatus as PrismaStatus,
  LoanAccountAuditLog as PrismaAudit,
} from "@prisma/client";
import type { LoanAccount, LoanStatus } from "../../domain/entities/LoanAccount";
import type { LoanAccountsAuditRecord } from "../../domain/entities/LoanAccountsAuditRecord";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

export function toLoanAccount(row: PrismaAccount): LoanAccount {
  return {
    id: row.id,
    organizationId: row.organizationId,
    originatingApplicationId: row.originatingApplicationId,
    customerId: row.customerId,
    bankId: row.bankId,
    bankBranchId: row.bankBranchId,
    loanProductId: row.loanProductId,
    loanStatusId: row.loanStatusId,
    sanctionedAmount: row.sanctionedAmount.toString(),
    interestRateSnapshot: row.interestRateSnapshot.toString(),
    tenureMonthsSnapshot: row.tenureMonthsSnapshot,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    supersededByLoanApplicationId: row.supersededByLoanApplicationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toLoanStatus(row: PrismaStatus): LoanStatus {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    isTerminal: row.isTerminal,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function toLoanAccountsAuditRecord(row: PrismaAudit): LoanAccountsAuditRecord {
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

import type {
  LoanApplication as PrismaApp,
  ApplicationStatus as PrismaStatus,
  LoanOffer as PrismaOffer,
  EligibilitySnapshot as PrismaEligibility,
  LoanApplicationAuditLog as PrismaAudit,
  Prisma,
} from "@prisma/client";
import type { ApplicationStatus, LoanApplication } from "../../domain/entities/LoanApplication";
import type { LoanOffer } from "../../domain/entities/LoanOffer";
import type { EligibilitySnapshot } from "../../domain/entities/EligibilitySnapshot";
import type { LoanApplicationsAuditRecord } from "../../domain/entities/LoanApplicationsAuditRecord";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

export function toLoanApplication(row: PrismaApp): LoanApplication {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    leadId: row.leadId,
    loanProductId: row.loanProductId,
    bankBranchId: row.bankBranchId,
    applicationStatusId: row.applicationStatusId,
    loanOfferId: row.loanOfferId,
    applicationType: row.applicationType,
    originatingLoanAccountId: row.originatingLoanAccountId,
    externalLoanReference: asRecord(row.externalLoanReference),
    requestedAmount: row.requestedAmount.toString(),
    requestedTenureMonths: row.requestedTenureMonths,
    submittedAt: row.submittedAt,
    decisionAt: row.decisionAt,
    decidedByUserId: row.decidedByUserId,
    rejectionReason: row.rejectionReason,
    withdrawnAt: row.withdrawnAt,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toApplicationStatus(row: PrismaStatus): ApplicationStatus {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    bucket: row.bucket,
    isTerminal: row.isTerminal,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function toLoanOffer(row: PrismaOffer): LoanOffer {
  return {
    id: row.id,
    organizationId: row.organizationId,
    leadId: row.leadId,
    eligibilitySnapshotId: row.eligibilitySnapshotId,
    bankId: row.bankId,
    loanProductId: row.loanProductId,
    offeredAmount: row.offeredAmount.toString(),
    offeredInterestRate: row.offeredInterestRate.toString(),
    offeredTenureMonths: row.offeredTenureMonths,
    status: row.status,
    generatedAt: row.generatedAt,
    presentedAt: row.presentedAt,
    decidedAt: row.decidedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toEligibilitySnapshot(row: PrismaEligibility): EligibilitySnapshot {
  return {
    id: row.id,
    loanApplicationId: row.loanApplicationId,
    customerId: row.customerId,
    method: row.method,
    inputsSnapshot: asRecord(row.inputsSnapshot) ?? {},
    decision: row.decision,
    computedCeilings: asRecord(row.computedCeilings) ?? {},
    computedByUserId: row.computedByUserId,
    computedAt: row.computedAt,
  };
}

export function toLoanApplicationsAuditRecord(row: PrismaAudit): LoanApplicationsAuditRecord {
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

export function appAuditJson(app: LoanApplication): Prisma.InputJsonValue {
  return {
    id: app.id,
    statusId: app.applicationStatusId,
    customerId: app.customerId,
    loanProductId: app.loanProductId,
    requestedAmount: app.requestedAmount,
  };
}

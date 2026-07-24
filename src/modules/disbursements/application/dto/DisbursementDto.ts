import type { Disbursement } from "../../domain/entities/Disbursement";
import type { Commission } from "../../domain/entities/Commission";

export interface DisbursementDto {
  id: string;
  organizationId: string;
  loanApplicationId: string;
  loanAccountId: string | null;
  bankId: string;
  status: Disbursement["status"];
  bankReferenceNumber: string;
  amount: string;
  trancheNumber: number;
  scheduledAt: string | null;
  disbursedAt: string | null;
  reconciledAt: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
  commission?: CommissionDto | null;
}

export interface CommissionDto {
  id: string;
  disbursementId: string;
  commissionPolicyVersionId: string;
  status: Commission["status"];
  rateSnapshot: Record<string, unknown>;
  computedAmount: string;
  clawbackRuleSnapshot: Record<string, unknown>;
  expectedAmount: string;
  receivedAmount: string | null;
  invoicedAt: string | null;
  receivedAt: string | null;
  reconciledAt: string | null;
}

export function toDisbursementDto(d: Disbursement, commission?: Commission | null): DisbursementDto {
  return {
    id: d.id,
    organizationId: d.organizationId,
    loanApplicationId: d.loanApplicationId,
    loanAccountId: d.loanAccountId,
    bankId: d.bankId,
    status: d.status,
    bankReferenceNumber: d.bankReferenceNumber,
    amount: d.amount,
    trancheNumber: d.trancheNumber,
    scheduledAt: d.scheduledAt?.toISOString() ?? null,
    disbursedAt: d.disbursedAt?.toISOString() ?? null,
    reconciledAt: d.reconciledAt?.toISOString() ?? null,
    reversedAt: d.reversedAt?.toISOString() ?? null,
    reversalReason: d.reversalReason,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    commission: commission ? toCommissionDto(commission) : null,
  };
}

export function toCommissionDto(c: Commission): CommissionDto {
  const received =
    c.status === "RECEIVED" || c.status === "RECONCILED" ? c.computedAmount : null;
  return {
    id: c.id,
    disbursementId: c.disbursementId,
    commissionPolicyVersionId: c.commissionPolicyVersionId,
    status: c.status,
    rateSnapshot: c.rateSnapshot,
    computedAmount: c.computedAmount,
    clawbackRuleSnapshot: c.clawbackRuleSnapshot,
    expectedAmount: c.computedAmount,
    receivedAmount: received,
    invoicedAt: c.invoicedAt?.toISOString() ?? null,
    receivedAt: c.receivedAt?.toISOString() ?? null,
    reconciledAt: c.reconciledAt?.toISOString() ?? null,
  };
}

import type { Disbursement, DisbursementStatus } from "../entities/Disbursement";
import type { Commission, CommissionStatus } from "../entities/Commission";
import type { DisbursementsAuditActor, DisbursementsAuditRecord } from "../entities/DisbursementsAuditRecord";

export interface CreateDisbursementData {
  organizationId: string;
  loanApplicationId: string;
  loanAccountId?: string | null;
  bankId: string;
  bankReferenceNumber: string;
  amount: string;
  trancheNumber: number;
  scheduledAt?: Date | null;
  status?: DisbursementStatus;
}

export interface CreateCommissionData {
  disbursementId: string;
  commissionPolicyVersionId: string;
  rateSnapshot: Record<string, unknown>;
  computedAmount: string;
  clawbackRuleSnapshot: Record<string, unknown>;
}

export interface DisbursementRepository {
  findById(id: string): Promise<Disbursement | null>;
  findByBankReference(bankId: string, bankReferenceNumber: string): Promise<Disbursement | null>;
  listByApplication(loanApplicationId: string): Promise<Disbursement[]>;
  list(organizationId: string, filter?: { status?: DisbursementStatus; limit?: number; offset?: number }): Promise<Disbursement[]>;
  nextTrancheNumber(loanApplicationId: string): Promise<number>;
  createWithAudit(data: CreateDisbursementData, actor: DisbursementsAuditActor, correlationId?: string | null): Promise<Disbursement>;
  updateStatusWithAudit(id: string, status: DisbursementStatus, actor: DisbursementsAuditActor, extras?: Partial<Pick<Disbursement, "loanAccountId" | "disbursedAt" | "reconciledAt" | "reversedAt" | "reversalReason">>, correlationId?: string | null): Promise<Disbursement>;
  createCommissionWithAudit(organizationId: string, data: CreateCommissionData, actor: DisbursementsAuditActor, correlationId?: string | null): Promise<Commission>;
  findCommissionByDisbursementId(disbursementId: string): Promise<Commission | null>;
  findCommissionById(id: string): Promise<Commission | null>;
  listCommissions(organizationId: string, filter?: { status?: CommissionStatus; limit?: number }): Promise<Commission[]>;
  updateCommissionStatusWithAudit(id: string, status: CommissionStatus, organizationId: string, actor: DisbursementsAuditActor, correlationId?: string | null): Promise<Commission>;
  listAuditLog(targetId: string): Promise<DisbursementsAuditRecord[]>;
}

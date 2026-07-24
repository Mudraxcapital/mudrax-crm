import type { LoanAccount, LoanStatus } from "../entities/LoanAccount";
import type { LoanAccountsAuditActor, LoanAccountsAuditRecord } from "../entities/LoanAccountsAuditRecord";

export interface OpenLoanAccountData {
  organizationId: string;
  originatingApplicationId: string;
  customerId: string;
  bankId: string;
  bankBranchId?: string | null;
  loanProductId: string;
  loanStatusId: string;
  sanctionedAmount: string;
  interestRateSnapshot: string;
  tenureMonthsSnapshot: number;
}

export interface LoanAccountRepository {
  findById(id: string): Promise<LoanAccount | null>;
  findByOriginatingApplicationId(applicationId: string): Promise<LoanAccount | null>;
  list(organizationId: string, filter?: { customerId?: string; bankId?: string; limit?: number; offset?: number }): Promise<LoanAccount[]>;
  openWithAudit(data: OpenLoanAccountData, actor: LoanAccountsAuditActor, correlationId?: string | null): Promise<LoanAccount>;
  closeWithAudit(id: string, actor: LoanAccountsAuditActor, correlationId?: string | null): Promise<LoanAccount>;
  findStatusByName(organizationId: string, name: string): Promise<LoanStatus | null>;
  listStatuses(organizationId: string): Promise<LoanStatus[]>;
  listAuditLog(targetId: string): Promise<LoanAccountsAuditRecord[]>;
}

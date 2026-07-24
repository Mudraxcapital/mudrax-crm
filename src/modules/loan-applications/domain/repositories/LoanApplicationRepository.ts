import type { ApplicationStatus, LoanApplication } from "../entities/LoanApplication";
import type { LoanOffer, LoanOfferStatus } from "../entities/LoanOffer";
import type { EligibilitySnapshot } from "../entities/EligibilitySnapshot";
import type { LoanApplicationsAuditActor, LoanApplicationsAuditRecord } from "../entities/LoanApplicationsAuditRecord";
import type { ApplicationType } from "../entities/LoanApplication";

export interface CreateLoanApplicationData {
  organizationId: string;
  customerId: string;
  leadId: string;
  loanProductId: string;
  bankBranchId?: string | null;
  applicationStatusId: string;
  loanOfferId?: string | null;
  applicationType?: ApplicationType;
  originatingLoanAccountId?: string | null;
  externalLoanReference?: Record<string, unknown> | null;
  requestedAmount: string;
  requestedTenureMonths: number;
  createdByUserId: string;
}

export interface UpdateLoanApplicationData {
  applicationStatusId?: string;
  bankBranchId?: string | null;
  requestedAmount?: string;
  requestedTenureMonths?: number;
  submittedAt?: Date | null;
  decisionAt?: Date | null;
  decidedByUserId?: string | null;
  rejectionReason?: string | null;
  withdrawnAt?: Date | null;
  loanOfferId?: string | null;
}

export interface CreateEligibilityData {
  loanApplicationId?: string | null;
  customerId: string;
  method: EligibilitySnapshot["method"];
  inputsSnapshot: Record<string, unknown>;
  decision: EligibilitySnapshot["decision"];
  computedCeilings: Record<string, unknown>;
  computedByUserId?: string | null;
}

export interface CreateLoanOfferData {
  organizationId: string;
  leadId: string;
  eligibilitySnapshotId: string;
  bankId: string;
  loanProductId: string;
  offeredAmount: string;
  offeredInterestRate: string;
  offeredTenureMonths: number;
  expiresAt?: Date | null;
}

export interface ListLoanApplicationsFilter {
  statusBucket?: string;
  customerId?: string;
  leadId?: string;
  limit?: number;
  offset?: number;
}

export interface LoanApplicationRepository {
  findById(id: string): Promise<LoanApplication | null>;
  list(organizationId: string, filter?: ListLoanApplicationsFilter): Promise<LoanApplication[]>;
  createWithAudit(data: CreateLoanApplicationData, actor: LoanApplicationsAuditActor, correlationId?: string | null): Promise<LoanApplication>;
  updateWithAudit(id: string, data: UpdateLoanApplicationData, actor: LoanApplicationsAuditActor, correlationId?: string | null): Promise<LoanApplication>;
  findStatusById(id: string): Promise<ApplicationStatus | null>;
  findStatusByBucket(organizationId: string, bucket: string): Promise<ApplicationStatus | null>;
  listStatuses(organizationId: string): Promise<ApplicationStatus[]>;
  createEligibilityWithAudit(organizationId: string, data: CreateEligibilityData, actor: LoanApplicationsAuditActor, correlationId?: string | null): Promise<EligibilitySnapshot>;
  findEligibilityById(id: string): Promise<EligibilitySnapshot | null>;
  createOfferWithAudit(data: CreateLoanOfferData, actor: LoanApplicationsAuditActor, correlationId?: string | null): Promise<LoanOffer>;
  findOfferById(id: string): Promise<LoanOffer | null>;
  listOffersByLead(organizationId: string, leadId: string): Promise<LoanOffer[]>;
  updateOfferStatusWithAudit(id: string, status: LoanOfferStatus, organizationId: string, actor: LoanApplicationsAuditActor, extras?: { presentedAt?: Date; decidedAt?: Date }, correlationId?: string | null): Promise<LoanOffer>;
  countByStatusBucket(organizationId: string): Promise<Record<string, number>>;
  listAuditLog(targetId: string): Promise<LoanApplicationsAuditRecord[]>;
}

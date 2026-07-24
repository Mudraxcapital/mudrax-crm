import type { LoanApplication, ApplicationStatus } from "../../domain/entities/LoanApplication";
import type { LoanOffer } from "../../domain/entities/LoanOffer";
import type { EligibilitySnapshot } from "../../domain/entities/EligibilitySnapshot";

export interface LoanApplicationDto {
  id: string;
  organizationId: string;
  customerId: string;
  leadId: string;
  loanProductId: string;
  bankBranchId: string | null;
  applicationStatusId: string;
  applicationStatusName?: string;
  applicationStatusBucket?: string;
  loanOfferId: string | null;
  applicationType: LoanApplication["applicationType"];
  originatingLoanAccountId: string | null;
  requestedAmount: string;
  requestedTenureMonths: number;
  submittedAt: string | null;
  decisionAt: string | null;
  decidedByUserId: string | null;
  rejectionReason: string | null;
  withdrawnAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  timeline: { label: string; at: string | null }[];
}

export interface LoanOfferDto {
  id: string;
  organizationId: string;
  leadId: string;
  eligibilitySnapshotId: string;
  bankId: string;
  loanProductId: string;
  offeredAmount: string;
  offeredInterestRate: string;
  offeredTenureMonths: number;
  status: LoanOffer["status"];
  generatedAt: string;
  presentedAt: string | null;
  decidedAt: string | null;
  expiresAt: string | null;
}

export interface EligibilitySnapshotDto {
  id: string;
  loanApplicationId: string | null;
  customerId: string;
  method: EligibilitySnapshot["method"];
  inputsSnapshot: Record<string, unknown>;
  decision: EligibilitySnapshot["decision"];
  computedCeilings: Record<string, unknown>;
  computedByUserId: string | null;
  computedAt: string;
}

export interface ApplicationStatusDto {
  id: string;
  name: string;
  bucket: ApplicationStatus["bucket"];
  isTerminal: boolean;
  sortOrder: number;
}

export interface LoanDashboardDto {
  activeApplications: number;
  approved: number;
  rejected: number;
  pending: number;
  totalDisbursedAmount: string;
  commissionPending: string;
  commissionReceived: string;
  topBanks: { bankId: string; bankName: string; applicationCount: number }[];
}

export function toLoanApplicationDto(
  app: LoanApplication,
  status?: ApplicationStatus | null,
): LoanApplicationDto {
  return {
    id: app.id,
    organizationId: app.organizationId,
    customerId: app.customerId,
    leadId: app.leadId,
    loanProductId: app.loanProductId,
    bankBranchId: app.bankBranchId,
    applicationStatusId: app.applicationStatusId,
    applicationStatusName: status?.name,
    applicationStatusBucket: status?.bucket,
    loanOfferId: app.loanOfferId,
    applicationType: app.applicationType,
    originatingLoanAccountId: app.originatingLoanAccountId,
    requestedAmount: app.requestedAmount,
    requestedTenureMonths: app.requestedTenureMonths,
    submittedAt: app.submittedAt?.toISOString() ?? null,
    decisionAt: app.decisionAt?.toISOString() ?? null,
    decidedByUserId: app.decidedByUserId,
    rejectionReason: app.rejectionReason,
    withdrawnAt: app.withdrawnAt?.toISOString() ?? null,
    createdByUserId: app.createdByUserId,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    timeline: [
      { label: "Created", at: app.createdAt.toISOString() },
      { label: "Submitted", at: app.submittedAt?.toISOString() ?? null },
      { label: "Decision", at: app.decisionAt?.toISOString() ?? null },
      { label: "Withdrawn", at: app.withdrawnAt?.toISOString() ?? null },
    ],
  };
}

export function toLoanOfferDto(offer: LoanOffer): LoanOfferDto {
  return {
    id: offer.id,
    organizationId: offer.organizationId,
    leadId: offer.leadId,
    eligibilitySnapshotId: offer.eligibilitySnapshotId,
    bankId: offer.bankId,
    loanProductId: offer.loanProductId,
    offeredAmount: offer.offeredAmount,
    offeredInterestRate: offer.offeredInterestRate,
    offeredTenureMonths: offer.offeredTenureMonths,
    status: offer.status,
    generatedAt: offer.generatedAt.toISOString(),
    presentedAt: offer.presentedAt?.toISOString() ?? null,
    decidedAt: offer.decidedAt?.toISOString() ?? null,
    expiresAt: offer.expiresAt?.toISOString() ?? null,
  };
}

export function toEligibilitySnapshotDto(s: EligibilitySnapshot): EligibilitySnapshotDto {
  return {
    id: s.id,
    loanApplicationId: s.loanApplicationId,
    customerId: s.customerId,
    method: s.method,
    inputsSnapshot: s.inputsSnapshot,
    decision: s.decision,
    computedCeilings: s.computedCeilings,
    computedByUserId: s.computedByUserId,
    computedAt: s.computedAt.toISOString(),
  };
}

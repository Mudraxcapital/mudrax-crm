export const APPLICATION_TYPES = ["STANDARD", "TOP_UP", "BALANCE_TRANSFER_IN"] as const;
export type ApplicationType = (typeof APPLICATION_TYPES)[number];

export const APPLICATION_STATUS_BUCKETS = [
  "DRAFT", "SUBMITTED", "UNDER_BANK_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN",
  "DISBURSEMENT_PENDING", "CONVERTED",
] as const;
export type ApplicationStatusBucket = (typeof APPLICATION_STATUS_BUCKETS)[number];

export interface ApplicationStatus {
  id: string;
  organizationId: string;
  name: string;
  bucket: ApplicationStatusBucket;
  isTerminal: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface LoanApplication {
  id: string;
  organizationId: string;
  customerId: string;
  leadId: string;
  loanProductId: string;
  bankBranchId: string | null;
  applicationStatusId: string;
  loanOfferId: string | null;
  applicationType: ApplicationType;
  originatingLoanAccountId: string | null;
  externalLoanReference: Record<string, unknown> | null;
  requestedAmount: string;
  requestedTenureMonths: number;
  submittedAt: Date | null;
  decisionAt: Date | null;
  decidedByUserId: string | null;
  rejectionReason: string | null;
  withdrawnAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

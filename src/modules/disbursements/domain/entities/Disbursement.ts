export const DISBURSEMENT_STATUSES = [
  "SCHEDULED_EXPECTED", "DISBURSED", "RECONCILED", "REVERSED", "FAILED",
] as const;
export type DisbursementStatus = (typeof DISBURSEMENT_STATUSES)[number];

export interface Disbursement {
  id: string;
  organizationId: string;
  loanApplicationId: string;
  loanAccountId: string | null;
  bankId: string;
  status: DisbursementStatus;
  bankReferenceNumber: string;
  amount: string;
  trancheNumber: number;
  scheduledAt: Date | null;
  disbursedAt: Date | null;
  reconciledAt: Date | null;
  reversedAt: Date | null;
  reversalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

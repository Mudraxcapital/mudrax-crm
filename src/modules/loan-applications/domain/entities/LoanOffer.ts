export const LOAN_OFFER_STATUSES = [
  "GENERATED", "PRESENTED", "SELECTED", "DECLINED", "EXPIRED", "SUPERSEDED",
] as const;
export type LoanOfferStatus = (typeof LOAN_OFFER_STATUSES)[number];

export interface LoanOffer {
  id: string;
  organizationId: string;
  leadId: string;
  eligibilitySnapshotId: string;
  bankId: string;
  loanProductId: string;
  offeredAmount: string;
  offeredInterestRate: string;
  offeredTenureMonths: number;
  status: LoanOfferStatus;
  generatedAt: Date;
  presentedAt: Date | null;
  decidedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

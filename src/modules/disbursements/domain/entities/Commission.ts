export const COMMISSION_STATUSES = ["ACCRUED", "INVOICED", "RECEIVED", "RECONCILED"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export interface Commission {
  id: string;
  disbursementId: string;
  commissionPolicyVersionId: string;
  status: CommissionStatus;
  rateSnapshot: Record<string, unknown>;
  computedAmount: string;
  clawbackRuleSnapshot: Record<string, unknown>;
  invoicedAt: Date | null;
  receivedAt: Date | null;
  reconciledAt: Date | null;
  clawbackAmount: string | null;
  clawbackAt: Date | null;
  clawbackReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

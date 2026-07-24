export const COMMISSION_POLICY_STATUSES = ["DRAFTED", "EFFECTIVE", "SUPERSEDED"] as const;
export type CommissionPolicyStatus = (typeof COMMISSION_POLICY_STATUSES)[number];

export interface CommissionPolicyVersion {
  id: string;
  bankId: string;
  loanProductId: string | null;
  versionNumber: number;
  status: CommissionPolicyStatus;
  rateStructure: Record<string, unknown>;
  clawbackWindowDays: number | null;
  clawbackRule: Record<string, unknown> | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  createdByUserId: string;
  createdAt: Date;
  publishedAt: Date | null;
}

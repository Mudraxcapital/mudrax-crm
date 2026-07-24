export const BANK_BRANCH_STATUSES = ["ADDED", "ACTIVE", "CLOSED"] as const;
export type BankBranchStatus = (typeof BANK_BRANCH_STATUSES)[number];

export interface BankBranch {
  id: string;
  bankId: string;
  name: string;
  code: string;
  address: string | null;
  status: BankBranchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const BANK_STATUSES = ["ONBOARDED", "ACTIVE", "SUSPENDED", "OFFBOARDED"] as const;
export type BankStatus = (typeof BANK_STATUSES)[number];

export interface Bank {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: BankStatus;
  createdAt: Date;
  updatedAt: Date;
}

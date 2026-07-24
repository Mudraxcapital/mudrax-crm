export const LOAN_PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "SUSPENDED", "RETIRED"] as const;
export type LoanProductStatus = (typeof LOAN_PRODUCT_STATUSES)[number];

export interface LoanProduct {
  id: string;
  organizationId: string;
  bankId: string;
  loanProductTypeId: string;
  variant: string;
  name: string;
  status: LoanProductStatus;
  minInterestRate: string;
  maxInterestRate: string;
  minTenureMonths: number;
  maxTenureMonths: number;
  minLoanAmount: string;
  maxLoanAmount: string;
  eligibilityRules: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanProductType {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

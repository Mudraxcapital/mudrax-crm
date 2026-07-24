export interface LoanStatus {
  id: string;
  organizationId: string;
  name: string;
  isTerminal: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface LoanAccount {
  id: string;
  organizationId: string;
  originatingApplicationId: string;
  customerId: string;
  bankId: string;
  bankBranchId: string | null;
  loanProductId: string;
  loanStatusId: string;
  sanctionedAmount: string;
  interestRateSnapshot: string;
  tenureMonthsSnapshot: number;
  openedAt: Date;
  closedAt: Date | null;
  supersededByLoanApplicationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Display account number derived from id (schema has no separate accountNumber column). */
export function formatAccountNumber(id: string): string {
  return `LA-${id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

import { formatAccountNumber, type LoanAccount, type LoanStatus } from "../../domain/entities/LoanAccount";

export interface LoanAccountDto {
  id: string;
  accountNumber: string;
  organizationId: string;
  originatingApplicationId: string;
  customerId: string;
  bankId: string;
  bankBranchId: string | null;
  loanProductId: string;
  loanStatusId: string;
  loanStatusName?: string;
  sanctionedAmount: string;
  interestRateSnapshot: string;
  tenureMonthsSnapshot: number;
  openedAt: string;
  closedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toLoanAccountDto(account: LoanAccount, status?: LoanStatus | null): LoanAccountDto {
  const isTerminal = status?.isTerminal ?? Boolean(account.closedAt);
  return {
    id: account.id,
    accountNumber: formatAccountNumber(account.id),
    organizationId: account.organizationId,
    originatingApplicationId: account.originatingApplicationId,
    customerId: account.customerId,
    bankId: account.bankId,
    bankBranchId: account.bankBranchId,
    loanProductId: account.loanProductId,
    loanStatusId: account.loanStatusId,
    loanStatusName: status?.name,
    sanctionedAmount: account.sanctionedAmount,
    interestRateSnapshot: account.interestRateSnapshot,
    tenureMonthsSnapshot: account.tenureMonthsSnapshot,
    openedAt: account.openedAt.toISOString(),
    closedAt: account.closedAt?.toISOString() ?? null,
    isActive: !isTerminal && !account.closedAt,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

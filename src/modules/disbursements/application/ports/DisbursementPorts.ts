export interface ApplicationLookup {
  id: string;
  organizationId: string;
  customerId: string;
  loanProductId: string;
  bankBranchId: string | null;
  statusBucket: string;
  requestedAmount: string;
  requestedTenureMonths: number;
}

export interface LoanApplicationLookupPort {
  findById(id: string): Promise<ApplicationLookup | null>;
  markConverted(applicationId: string, organizationId: string, actor: { actorType: "USER" | "SYSTEM" | "AI"; actorId: string | null }): Promise<void>;
}

export interface LoanProductLookup {
  id: string;
  bankId: string;
  minInterestRate: string;
  status: string;
}

export interface LoanProductLookupPort {
  findById(id: string): Promise<LoanProductLookup | null>;
}

export interface CommissionPolicyLookup {
  id: string;
  rateStructure: Record<string, unknown>;
  clawbackRule: Record<string, unknown> | null;
}

export interface CommissionPolicyLookupPort {
  findEffective(bankId: string, loanProductId?: string | null): Promise<CommissionPolicyLookup | null>;
}

export interface OpenLoanAccountCommand {
  organizationId: string;
  originatingApplicationId: string;
  customerId: string;
  bankId: string;
  bankBranchId?: string | null;
  loanProductId: string;
  sanctionedAmount: string;
  interestRateSnapshot: string;
  tenureMonthsSnapshot: number;
}

export interface LoanAccountPort {
  findByApplicationId(applicationId: string): Promise<{ id: string } | null>;
  open(command: OpenLoanAccountCommand, actor: { actorType: "USER" | "SYSTEM" | "AI"; actorId: string | null }): Promise<{ id: string }>;
}

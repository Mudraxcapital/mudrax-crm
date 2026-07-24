export interface BankLookupSummary {
  id: string;
  organizationId: string;
  status: string;
}

export interface BankLookupPort {
  findById(bankId: string): Promise<BankLookupSummary | null>;
}

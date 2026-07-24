export interface CustomerLookupSummary {
  id: string;
  organizationId: string;
  email: string | null;
  phone: string | null;
}

export interface CustomerLookupPort {
  findById(customerId: string): Promise<CustomerLookupSummary | null>;
}

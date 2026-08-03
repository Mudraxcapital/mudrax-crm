// ============================================================================
// src/modules/leads/application/ports/CustomerLookupPort.ts
//
// Port (interface) this module depends on to resolve the Customer every
// Lead must belong to (leads.md/customers.md), without importing anything
// from `customers`' internal folders — only its public index.ts, wired in
// this module's own index.ts (ADR 0001 one-directional module dependency).
// ============================================================================

export interface CustomerLookupSummary {
  id: string;
  organizationId: string;
  fullName: string;
}

export interface ResolveOrCreateCustomerInput {
  organizationId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  actorUserId: string;
  ownerManagerId?: string | null;
}

export interface CustomerLookupPort {
  findById(customerId: string): Promise<CustomerLookupSummary | null>;
  /** Import path: find by phone/email when possible, otherwise create a Customer. */
  resolveOrCreate?(input: ResolveOrCreateCustomerInput): Promise<CustomerLookupSummary>;
  /**
   * Bulk import path: resolve/create many Customers with a few DB round-trips.
   * Return order matches `inputs`.
   */
  resolveOrCreateMany?(
    inputs: ResolveOrCreateCustomerInput[],
  ): Promise<CustomerLookupSummary[]>;
}

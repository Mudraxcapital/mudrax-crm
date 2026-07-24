// ============================================================================
// src/modules/documents/application/ports/CustomerLookupPort.ts
//
// Port (interface) this module depends on to validate a Document's
// polymorphic owner when `ownerType = CUSTOMER`, without importing anything
// from `customers`' internal folders — only its public index.ts, wired in
// this module's own index.ts (ADR 0001 one-directional module dependency).
// ============================================================================

export interface CustomerLookupSummary {
  id: string;
  organizationId: string;
}

export interface CustomerLookupPort {
  findById(customerId: string): Promise<CustomerLookupSummary | null>;
}

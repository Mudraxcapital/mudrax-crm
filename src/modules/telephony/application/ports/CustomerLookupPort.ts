// ============================================================================
// src/modules/telephony/application/ports/CustomerLookupPort.ts
//
// Port (interface) this module depends on to validate a Call Attempt's
// optional `customerId` reference, without importing anything from
// `customers`' internal folders — only its public index.ts, wired in this
// module's own index.ts (ADR 0001 one-directional module dependency).
// ============================================================================

export interface CustomerLookupSummary {
  id: string;
  organizationId: string;
}

export interface CustomerLookupPort {
  findById(customerId: string): Promise<CustomerLookupSummary | null>;
}

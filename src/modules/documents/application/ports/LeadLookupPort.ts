// ============================================================================
// src/modules/documents/application/ports/LeadLookupPort.ts
//
// Port (interface) this module depends on to validate a Document's
// polymorphic owner when `ownerType = LEAD`, without importing anything
// from `leads`' internal folders — only its public index.ts, wired in this
// module's own index.ts (ADR 0001 one-directional module dependency).
// ============================================================================

export interface LeadLookupSummary {
  id: string;
  organizationId: string;
}

export interface LeadLookupPort {
  findById(leadId: string): Promise<LeadLookupSummary | null>;
}

// ============================================================================
// src/modules/telephony/application/ports/LeadLookupPort.ts
//
// Port (interface) this module depends on to validate a Call Attempt's
// optional `leadId` reference, without importing anything from `leads`'
// internal folders — only its public index.ts, wired in this module's own
// index.ts (ADR 0001 one-directional module dependency).
// ============================================================================

export interface LeadLookupSummary {
  id: string;
  organizationId: string;
}

export interface LeadLookupPort {
  findById(leadId: string): Promise<LeadLookupSummary | null>;
}

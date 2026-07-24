// ============================================================================
// src/modules/follow-ups/application/ports/LeadLookupPort.ts
//
// Port (interface) this module depends on to resolve the Lead every
// Follow-up must reference (follow-ups.md/leads.md), without importing
// anything from `leads`' internal folders — only its public index.ts, wired
// in this module's own index.ts (ADR 0001 one-directional module
// dependency).
// ============================================================================

export interface LeadLookupSummary {
  id: string;
  organizationId: string;
  currentAssigneeUserId: string | null;
}

export interface LeadLookupPort {
  findById(leadId: string): Promise<LeadLookupSummary | null>;
}

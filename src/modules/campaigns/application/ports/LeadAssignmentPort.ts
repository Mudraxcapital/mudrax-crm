// ============================================================================
// src/modules/campaigns/application/ports/LeadAssignmentPort.ts
//
// Port (interface) this module depends on to resolve Leads and to initiate
// their assignment through `leads`' public API (campaigns.md — "a decision,
// not a write. This module ... initiates the assignment by calling `leads`'
// public API — it never writes Lead state directly."), without importing
// anything from `leads`' internal folders.
// ============================================================================

export interface LeadAssignmentLookupSummary {
  id: string;
  organizationId: string;
  currentAssigneeUserId: string | null;
  permanentAssigneeUserId: string | null;
  temporaryAssigneeUntil: string | null;
  isTemporaryAssignee: boolean;
  currentStageBucket: "INITIAL" | "ACTIVE" | "CLOSED";
  wonAt: string | null;
  lostAt: string | null;
}

export interface LeadAssignmentPort {
  findById(leadId: string): Promise<LeadAssignmentLookupSummary | null>;
  listByCampaign(
    organizationId: string,
    campaignId: string,
  ): Promise<LeadAssignmentLookupSummary[]>;

  /** Initiates one Lead's assignment via `leads`' own assignLead use-case, tagged with the originating Campaign Assignment (ADR 0004). */
  assign(
    leadId: string,
    assignedToUserId: string,
    actorId: string | null,
    campaignAssignmentId: string,
  ): Promise<void>;

  /** Temporary holiday/cover assignment via `leads`.temporarilyAssignLead. */
  temporarilyAssign(
    leadId: string,
    assignedToUserId: string,
    durationDays: number,
    actorId: string | null,
  ): Promise<void>;

  /** End temporary cover early via `leads`.revertTemporaryLeadAssignment. */
  revertTemporary(leadId: string, actorId: string | null): Promise<void>;
}

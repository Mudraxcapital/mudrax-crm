// ============================================================================
// src/modules/leads/domain/entities/LeadAssignment.ts
//
// The current assignee and the auditable, append-only history of how Lead
// ownership changed (leads.md). `leads` is the sole owner and sole writer.
// ============================================================================

export const ASSIGNMENT_TYPES = [
  "INITIAL",
  "CAMPAIGN_ALLOCATION",
  "MANUAL_REASSIGNMENT",
  "TEMPORARY_REASSIGNMENT",
] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export interface LeadAssignment {
  id: string;
  leadId: string;
  assignedToUserId: string;
  assignedByUserId: string | null;
  assignmentType: AssignmentType;
  campaignAssignmentId: string | null;
  assignedAt: Date;
  unassignedAt: Date | null;
}

// ============================================================================
// src/modules/leads/domain/entities/LeadNote.ts
//
// A Caller's optional free-text note on a Lead (leads.md). Edits are tracked
// via LeadAuditLog ("LeadNoteUpdated" before/after state), giving full audit
// history of every revision even though the row itself is mutated in place.
// ============================================================================

export interface LeadNote {
  id: string;
  leadId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
}

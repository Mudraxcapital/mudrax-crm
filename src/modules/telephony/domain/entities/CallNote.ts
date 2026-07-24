// ============================================================================
// src/modules/telephony/domain/entities/CallNote.ts
//
// Free-text note linked to exactly one Call Attempt — this module's
// equivalent of `leads`' LeadNote, kept here because it annotates call
// execution, not Lead state.
// ============================================================================

export interface CallNote {
  id: string;
  callAttemptId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

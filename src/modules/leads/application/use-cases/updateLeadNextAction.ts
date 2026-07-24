// ============================================================================
// src/modules/leads/application/use-cases/updateLeadNextAction.ts
//
// Updates the Lead's denormalized "next action" projection. Exposed via this
// module's public API exclusively for the follow-ups module to call after
// creating/completing/cancelling a Follow-up (leads.md: "updated exclusively
// by a Follow-up domain-event listener — no other code path may write it").
// Deliberately not Audit-logged as a Lead change (it is a read-side
// projection, not a user-facing Lead edit); the Follow-up's own Audit Trail
// is the durable record of why it changed.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";

export function makeUpdateLeadNextAction(repository: LeadRepository) {
  return async function updateLeadNextAction(
    leadId: string,
    nextActionAt: Date | null,
    nextActionType: string | null,
  ): Promise<void> {
    await repository.updateNextAction(leadId, nextActionAt, nextActionType);
  };
}

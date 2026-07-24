// ============================================================================
// src/modules/follow-ups/infrastructure/adapters/LeadsModuleLookupAdapter.ts
//
// Adapts `leads`' public API (index.ts) to this module's LeadLookupPort and
// LeadNextActionPort — the only file in `follow-ups` allowed to import from
// `leads` (ADR 0001: cross-module dependencies only through index.ts).
// ============================================================================

import { getLead, LeadNotFoundError, updateLeadNextAction } from "@/modules/leads";
import type { LeadLookupPort, LeadLookupSummary } from "../../application/ports/LeadLookupPort";
import type { LeadNextActionPort } from "../../application/ports/LeadNextActionPort";

export class LeadsModuleLookupAdapter implements LeadLookupPort, LeadNextActionPort {
  async findById(leadId: string): Promise<LeadLookupSummary | null> {
    try {
      const lead = await getLead(leadId);
      return {
        id: lead.id,
        organizationId: lead.organizationId,
        currentAssigneeUserId: lead.currentAssigneeUserId,
      };
    } catch (error) {
      if (error instanceof LeadNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  async updateNextAction(
    leadId: string,
    nextActionAt: Date | null,
    nextActionType: string | null,
  ): Promise<void> {
    await updateLeadNextAction(leadId, nextActionAt, nextActionType);
  }
}

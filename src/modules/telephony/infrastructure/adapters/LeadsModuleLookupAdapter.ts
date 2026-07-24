// ============================================================================
// src/modules/telephony/infrastructure/adapters/LeadsModuleLookupAdapter.ts
//
// Adapts `leads`' public API (index.ts) to this module's LeadLookupPort —
// the only file in `telephony` allowed to import from `leads` (ADR 0001).
// ============================================================================

import { getLead } from "@/modules/leads";
import type { LeadLookupPort, LeadLookupSummary } from "../../application/ports/LeadLookupPort";

export class LeadsModuleLookupAdapter implements LeadLookupPort {
  async findById(leadId: string): Promise<LeadLookupSummary | null> {
    const lead = await getLead(leadId);
    if (!lead) return null;
    return { id: lead.id, organizationId: lead.organizationId };
  }
}

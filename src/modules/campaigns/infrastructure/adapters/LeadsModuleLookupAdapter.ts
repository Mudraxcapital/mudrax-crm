// ============================================================================
// src/modules/campaigns/infrastructure/adapters/LeadsModuleLookupAdapter.ts
//
// Adapts `leads`' public API (index.ts) to this module's LeadAssignmentPort —
// the only file in `campaigns` allowed to import from `leads` (ADR 0001).
// This module never writes Lead state directly (ADR 0004); it initiates
// assignment by calling `leads`.assignLead, tagged with campaignAssignmentId.
// ============================================================================

import {
  assignLead,
  getLead,
  listLeads,
  revertTemporaryLeadAssignment,
  temporarilyAssignLead,
} from "@/modules/leads";
import type {
  LeadAssignmentLookupSummary,
  LeadAssignmentPort,
} from "../../application/ports/LeadAssignmentPort";

function toSummary(lead: {
  id: string;
  organizationId: string;
  currentAssigneeUserId: string | null;
  permanentAssigneeUserId: string | null;
  temporaryAssigneeUntil: string | null;
  isTemporaryAssignee: boolean;
  currentStageBucket: "INITIAL" | "ACTIVE" | "CLOSED";
  wonAt: string | null;
  lostAt: string | null;
}): LeadAssignmentLookupSummary {
  return {
    id: lead.id,
    organizationId: lead.organizationId,
    currentAssigneeUserId: lead.currentAssigneeUserId,
    permanentAssigneeUserId: lead.permanentAssigneeUserId,
    temporaryAssigneeUntil: lead.temporaryAssigneeUntil,
    isTemporaryAssignee: lead.isTemporaryAssignee,
    currentStageBucket: lead.currentStageBucket,
    wonAt: lead.wonAt,
    lostAt: lead.lostAt,
  };
}

export class LeadsModuleLookupAdapter implements LeadAssignmentPort {
  async findById(leadId: string): Promise<LeadAssignmentLookupSummary | null> {
    try {
      const lead = await getLead(leadId);
      return toSummary(lead);
    } catch {
      return null;
    }
  }

  async listByCampaign(
    organizationId: string,
    campaignId: string,
  ): Promise<LeadAssignmentLookupSummary[]> {
    // Campaign redistribution / assignment must see the full lead set — never
    // the UI list default of 50.
    const leads = await listLeads(organizationId, { campaignId, limit: 100_000 });
    return leads.map(toSummary);
  }

  async assign(
    leadId: string,
    assignedToUserId: string,
    actorId: string | null,
    campaignAssignmentId: string,
  ): Promise<void> {
    await assignLead({
      id: leadId,
      input: { assignedToUserId },
      actor: { actorType: actorId ? "USER" : "SYSTEM", actorId },
      campaignAssignmentId,
    });
  }

  async temporarilyAssign(
    leadId: string,
    assignedToUserId: string,
    durationDays: number,
    actorId: string | null,
  ): Promise<void> {
    await temporarilyAssignLead({
      id: leadId,
      assignedToUserId,
      durationDays,
      actor: { actorType: actorId ? "USER" : "SYSTEM", actorId },
    });
  }

  async revertTemporary(leadId: string, actorId: string | null): Promise<void> {
    await revertTemporaryLeadAssignment({
      id: leadId,
      actor: { actorType: actorId ? "USER" : "SYSTEM", actorId },
    });
  }
}

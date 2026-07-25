// ============================================================================
// src/modules/campaigns/__tests__/fakeLookupPorts.ts
//
// In-memory UserLookupPort/LeadAssignmentPort doubles for use-case unit
// tests, standing in for the real Users/Leads module adapters.
// ============================================================================

import type { UserLookupPort, UserLookupSummary } from "../application/ports/UserLookupPort";
import type {
  LeadAssignmentLookupSummary,
  LeadAssignmentPort,
} from "../application/ports/LeadAssignmentPort";

export class FakeUserLookupPort implements UserLookupPort {
  users = new Map<string, UserLookupSummary>();

  async findById(userId: string): Promise<UserLookupSummary | null> {
    return this.users.get(userId) ?? null;
  }
}

export class FakeLeadAssignmentPort implements LeadAssignmentPort {
  leads = new Map<string, LeadAssignmentLookupSummary>();
  assignCalls: {
    leadId: string;
    assignedToUserId: string;
    actorId: string | null;
    campaignAssignmentId: string;
  }[] = [];
  failFor = new Set<string>();

  async findById(leadId: string): Promise<LeadAssignmentLookupSummary | null> {
    return this.leads.get(leadId) ?? null;
  }

  async listByCampaign(
    organizationId: string,
    _campaignId: string,
  ): Promise<LeadAssignmentLookupSummary[]> {
    return [...this.leads.values()].filter((lead) => lead.organizationId === organizationId);
  }

  async assign(
    leadId: string,
    assignedToUserId: string,
    actorId: string | null,
    campaignAssignmentId: string,
  ): Promise<void> {
    if (this.failFor.has(leadId)) {
      throw new Error(`Simulated assignment failure for Lead ${leadId}`);
    }
    this.assignCalls.push({ leadId, assignedToUserId, actorId, campaignAssignmentId });
  }
}

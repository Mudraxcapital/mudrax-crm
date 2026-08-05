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

export function fakeLeadSummary(
  partial: Partial<LeadAssignmentLookupSummary> &
    Pick<LeadAssignmentLookupSummary, "id" | "organizationId">,
): LeadAssignmentLookupSummary {
  return {
    currentAssigneeUserId: null,
    permanentAssigneeUserId: null,
    temporaryAssigneeUntil: null,
    isTemporaryAssignee: false,
    currentStageBucket: "INITIAL",
    wonAt: null,
    lostAt: null,
    ...partial,
  };
}

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
  tempAssignCalls: {
    leadId: string;
    assignedToUserId: string;
    durationDays: number;
    actorId: string | null;
  }[] = [];
  revertTempCalls: { leadId: string; actorId: string | null }[] = [];
  failFor = new Set<string>();

  async findById(leadId: string): Promise<LeadAssignmentLookupSummary | null> {
    return this.leads.get(leadId) ?? null;
  }

  async listByCampaign(
    organizationId: string,
    campaignId: string,
  ): Promise<LeadAssignmentLookupSummary[]> {
    void campaignId;
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
    const existing = this.leads.get(leadId);
    if (existing) {
      this.leads.set(leadId, {
        ...existing,
        currentAssigneeUserId: assignedToUserId,
        permanentAssigneeUserId: null,
        temporaryAssigneeUntil: null,
        isTemporaryAssignee: false,
      });
    }
  }

  async temporarilyAssign(
    leadId: string,
    assignedToUserId: string,
    durationDays: number,
    actorId: string | null,
  ): Promise<void> {
    if (this.failFor.has(leadId)) {
      throw new Error(`Simulated assignment failure for Lead ${leadId}`);
    }
    this.tempAssignCalls.push({ leadId, assignedToUserId, durationDays, actorId });
    const existing = this.leads.get(leadId);
    if (existing) {
      const until = new Date();
      until.setUTCDate(until.getUTCDate() + durationDays);
      this.leads.set(leadId, {
        ...existing,
        permanentAssigneeUserId:
          existing.permanentAssigneeUserId ?? existing.currentAssigneeUserId,
        currentAssigneeUserId: assignedToUserId,
        temporaryAssigneeUntil: until.toISOString(),
        isTemporaryAssignee: true,
      });
    }
  }

  async revertTemporary(leadId: string, actorId: string | null): Promise<void> {
    if (this.failFor.has(leadId)) {
      throw new Error(`Simulated assignment failure for Lead ${leadId}`);
    }
    this.revertTempCalls.push({ leadId, actorId });
    const existing = this.leads.get(leadId);
    if (existing?.permanentAssigneeUserId) {
      this.leads.set(leadId, {
        ...existing,
        currentAssigneeUserId: existing.permanentAssigneeUserId,
        permanentAssigneeUserId: null,
        temporaryAssigneeUntil: null,
        isTemporaryAssignee: false,
      });
    }
  }
}

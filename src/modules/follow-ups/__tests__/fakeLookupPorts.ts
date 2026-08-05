// ============================================================================
// src/modules/follow-ups/__tests__/fakeLookupPorts.ts
//
// In-memory LeadLookupPort/LeadNextActionPort/UserLookupPort doubles for
// use-case unit tests, standing in for the real Leads/Users module adapters.
// ============================================================================

import type { LeadLookupPort, LeadLookupSummary } from "../application/ports/LeadLookupPort";
import type { LeadNextActionPort } from "../application/ports/LeadNextActionPort";
import type {
  UserHierarchyLookup,
  UserLookupPort,
  UserLookupSummary,
} from "../application/ports/UserLookupPort";

export class FakeLeadLookupPort implements LeadLookupPort, LeadNextActionPort {
  leads = new Map<string, LeadLookupSummary>();
  nextActionCalls: { leadId: string; nextActionAt: Date | null; nextActionType: string | null }[] =
    [];

  async findById(leadId: string): Promise<LeadLookupSummary | null> {
    return this.leads.get(leadId) ?? null;
  }

  async updateNextAction(
    leadId: string,
    nextActionAt: Date | null,
    nextActionType: string | null,
  ): Promise<void> {
    this.nextActionCalls.push({ leadId, nextActionAt, nextActionType });
  }
}

export class FakeUserLookupPort implements UserLookupPort {
  users = new Map<string, UserLookupSummary>();
  hierarchy = new Map<string, UserHierarchyLookup>();
  adminIdsByOrg = new Map<string, string[]>();

  async findById(userId: string): Promise<UserLookupSummary | null> {
    return this.users.get(userId) ?? null;
  }

  async findHierarchy(userId: string): Promise<UserHierarchyLookup | null> {
    return this.hierarchy.get(userId) ?? null;
  }

  async listActiveAdminIds(organizationId: string): Promise<string[]> {
    return this.adminIdsByOrg.get(organizationId) ?? [];
  }
}

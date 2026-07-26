// ============================================================================
// Presentation-boundary helper: load a Lead and enforce hierarchy ownership
// using the same rules as Lead Detail. Used by Server Actions and API routes.
// ============================================================================

import {
  getLead,
  getLeadsByIds,
  LeadNotFoundError,
  type LeadDto,
} from "@/modules/leads";
import type { AuthorizationContext } from "@/modules/rbac";
import {
  assertCanAccessLead,
  LeadAccessDeniedError,
} from "@/shared/auth/assertCanAccessLead";

export async function requireAccessibleLead(
  authContext: AuthorizationContext,
  leadId: string,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): Promise<LeadDto> {
  let lead: LeadDto;
  try {
    lead = await getLead(leadId);
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      throw new LeadAccessDeniedError();
    }
    throw error;
  }

  assertCanAccessLead(authContext, lead, {
    permissionCode: options?.permissionCode,
    actorUserId: options?.actorUserId ?? authContext.userId,
  });
  return lead;
}

export async function requireAccessibleLeads(
  authContext: AuthorizationContext,
  leadIds: string[],
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): Promise<Map<string, LeadDto>> {
  const uniqueIds = [...new Set(leadIds)];
  const leads = await getLeadsByIds(uniqueIds);
  const byId = new Map(leads.map((lead) => [lead.id, lead]));

  for (const id of uniqueIds) {
    const lead = byId.get(id);
    if (!lead) {
      throw new LeadAccessDeniedError(
        "One or more Leads were not found or are outside your hierarchy.",
      );
    }
    assertCanAccessLead(authContext, lead, {
      permissionCode: options?.permissionCode,
      actorUserId: options?.actorUserId ?? authContext.userId,
    });
  }

  return byId;
}

export { LeadAccessDeniedError };

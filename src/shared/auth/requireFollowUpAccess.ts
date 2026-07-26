// ============================================================================
// Shared Follow-up access gate — API routes must apply the same hierarchy
// checks as Follow-up server actions (assertCanAccessLead on the parent Lead).
// ============================================================================

import { getFollowUp, FollowUpNotFoundError, type FollowUpDto } from "@/modules/follow-ups";
import { getLead, LeadNotFoundError, type LeadDto } from "@/modules/leads";
import type { AuthorizationContext } from "@/modules/rbac";
import {
  assertCanAccessLead,
  LeadAccessDeniedError,
} from "@/shared/auth/assertCanAccessLead";

export async function requireFollowUpAccess(
  authContext: AuthorizationContext,
  followUpId: string,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): Promise<{ followUp: FollowUpDto; lead: LeadDto }> {
  let followUp: FollowUpDto;
  try {
    followUp = await getFollowUp(followUpId);
  } catch (error) {
    if (error instanceof FollowUpNotFoundError) {
      throw new FollowUpNotFoundError(followUpId);
    }
    throw error;
  }

  if (followUp.organizationId !== authContext.organizationId) {
    throw new FollowUpNotFoundError(followUpId);
  }

  let lead: LeadDto;
  try {
    lead = await getLead(followUp.leadId);
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      throw new FollowUpNotFoundError(followUpId);
    }
    throw error;
  }

  try {
    assertCanAccessLead(authContext, lead, {
      permissionCode: options?.permissionCode ?? "lead.view",
      actorUserId: options?.actorUserId ?? authContext.userId,
    });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      // Avoid leaking existence across hierarchy boundaries.
      throw new FollowUpNotFoundError(followUpId);
    }
    throw error;
  }

  return { followUp, lead };
}

// ============================================================================
// Resolves Manager / Team Lead ownership for lead imports.
// ============================================================================

import type { AuthorizationContext } from "@/modules/rbac";
import { resolveOwnerManagerId } from "@/modules/rbac";
import { getCampaign } from "@/modules/campaigns";
import { getUser } from "@/modules/users";

/**
 * Derives a single Manager id from selected callers / agents.
 * Throws when selected people belong to more than one Manager book.
 */
async function ownerManagerFromAssignees(userIds: string[]): Promise<string | null> {
  const managerIds = new Set<string>();

  for (const userId of userIds) {
    try {
      const user = await getUser(userId);
      if (user.roleName === "Manager") {
        managerIds.add(user.id);
        continue;
      }
      if (user.reportingManagerId) {
        managerIds.add(user.reportingManagerId);
        continue;
      }
      if (user.roleName === "Team Lead") {
        // Team Lead without reportingManagerId is incomplete hierarchy data.
        continue;
      }
      if (user.assignedTeamLeadId) {
        const teamLead = await getUser(user.assignedTeamLeadId);
        if (teamLead.reportingManagerId) {
          managerIds.add(teamLead.reportingManagerId);
        } else if (teamLead.roleName === "Manager") {
          managerIds.add(teamLead.id);
        }
      }
    } catch {
      // Skip unresolved assignees.
    }
  }

  if (managerIds.size === 0) return null;
  if (managerIds.size > 1) {
    throw new Error(
      "Selected callers belong to different Managers. Choose one Manager or Team Lead, or select callers from the same Manager.",
    );
  }
  return [...managerIds][0]!;
}

export async function resolveImportOwnership(input: {
  authContext: AuthorizationContext;
  campaignId?: string | null;
  agentUserIds?: string[];
  manualAssigneeUserId?: string | null;
  explicitOwnerManagerId?: string | null;
}): Promise<{ ownerManagerId: string | null; ownerTeamLeadId: string | null }> {
  const { authContext } = input;
  let ownerManagerId =
    resolveOwnerManagerId(authContext, input.explicitOwnerManagerId) ?? null;

  if (!ownerManagerId && input.campaignId) {
    try {
      const campaign = await getCampaign(input.campaignId);
      ownerManagerId = campaign.ownerManagerId;
    } catch {
      // Campaign may be invalid — keep null and let import validation surface it.
    }
  }

  const candidateIds = [
    ...(input.agentUserIds ?? []),
    ...(input.manualAssigneeUserId ? [input.manualAssigneeUserId] : []),
  ];

  if (!ownerManagerId && candidateIds.length > 0) {
    ownerManagerId = await ownerManagerFromAssignees(candidateIds);
  }

  let ownerTeamLeadId = authContext.hierarchy.teamLeadId;

  for (const userId of candidateIds) {
    try {
      const user = await getUser(userId);
      if (user.roleName === "Team Lead") {
        ownerTeamLeadId = user.id;
        break;
      }
      if (user.assignedTeamLeadId) {
        ownerTeamLeadId = user.assignedTeamLeadId;
        break;
      }
    } catch {
      // Skip unresolved assignees.
    }
  }

  return { ownerManagerId, ownerTeamLeadId };
}

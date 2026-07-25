// ============================================================================
// Resolves Manager / Team Lead ownership for lead imports.
// ============================================================================

import type { AuthorizationContext } from "@/modules/rbac";
import { resolveOwnerManagerId } from "@/modules/rbac";
import { getCampaign } from "@/modules/campaigns";
import { getUser } from "@/modules/users";

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

  let ownerTeamLeadId = authContext.hierarchy.teamLeadId;
  const candidateIds = [
    ...(input.agentUserIds ?? []),
    ...(input.manualAssigneeUserId ? [input.manualAssigneeUserId] : []),
  ];

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

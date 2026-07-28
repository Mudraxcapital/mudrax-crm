// ============================================================================
// Resolves Manager / Team Lead ownership for lead imports.
// ============================================================================

import type { AuthorizationContext } from "@/modules/rbac";
import { resolveOwnerManagerId } from "@/modules/rbac";
import { getCampaign } from "@/modules/campaigns";
import { getUser } from "@/modules/users";

/**
 * Derives Manager id(s) from selected callers / agents.
 * When `allowMixed` is false, throws if they span more than one Manager book.
 * When `allowMixed` is true (All agents), returns null so each lead can take
 * ownership from its assignee instead of a single batch Manager.
 */
async function ownerManagerFromAssignees(
  userIds: string[],
  allowMixed = false,
): Promise<string | null> {
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
    if (allowMixed) return null;
    throw new Error(
      "Selected agents belong to different Managers. Choose one Manager or Team Lead, or select agents from the same Manager.",
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
  /** When true (All agents), allow assigning across Manager books. */
  allowMixedManagers?: boolean;
}): Promise<{ ownerManagerId: string | null; ownerTeamLeadId: string | null }> {
  const { authContext } = input;
  const allowMixed = input.allowMixedManagers === true;
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

  // All agents: each lead inherits ownership from its assignee at create time.
  if (allowMixed) {
    return { ownerManagerId: null, ownerTeamLeadId: null };
  }

  if (!ownerManagerId && candidateIds.length > 0) {
    ownerManagerId = await ownerManagerFromAssignees(candidateIds, false);
  }

  let ownerTeamLeadId = authContext.hierarchy.teamLeadId;
  let hasHierarchicalCaller = false;
  let hasDirectAdminCaller = false;

  for (const userId of candidateIds) {
    try {
      const user = await getUser(userId);
      if (user.roleName === "Caller" && !user.assignedTeamLeadId) {
        hasDirectAdminCaller = true;
        continue;
      }
      if (user.roleName === "Admin") {
        // Admin agents are org-scoped (same book clearing as Direct Admin Callers).
        hasDirectAdminCaller = true;
        continue;
      }
      if (user.roleName === "Manager") {
        // Managers take calls in their own book (no Team Lead ownership).
        hasHierarchicalCaller = true;
        continue;
      }
      if (user.roleName === "Team Lead") {
        hasHierarchicalCaller = true;
        ownerTeamLeadId = user.id;
        break;
      }
      if (user.assignedTeamLeadId) {
        hasHierarchicalCaller = true;
        ownerTeamLeadId = user.assignedTeamLeadId;
        break;
      }
    } catch {
      // Skip unresolved assignees.
    }
  }

  // Direct Admin Callers / Admin agents are org-scoped — never place them in a Manager book.
  if (hasDirectAdminCaller && !hasHierarchicalCaller) {
    return { ownerManagerId: null, ownerTeamLeadId: null };
  }
  if (hasDirectAdminCaller && hasHierarchicalCaller) {
    throw new Error(
      "Cannot mix Admins or Direct Admin Callers (freelancers) with Managers, Team Leads, or hierarchical Callers in one import.",
    );
  }

  return { ownerManagerId, ownerTeamLeadId };
}

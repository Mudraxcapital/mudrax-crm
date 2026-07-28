// ============================================================================
// Shared validation for user-delete reassignment targets.
// ============================================================================

import { InvalidUserHierarchyError } from "../../domain/errors/UserErrors";
import { isDirectAdminCallerReassignment } from "./callerReassignment";

export function assertReassignmentTargetsNotInDeleteSet(input: {
  userIds: string[];
  reassignCallersToTeamLeadId?: string | null;
  reassignTeamLeadsToManagerId?: string | null;
  reassignLeadsToUserId?: string | null;
}): void {
  const deleting = new Set(input.userIds);
  const pairs: Array<[string | null | undefined, string]> = [
    [input.reassignCallersToTeamLeadId, "Callers cannot be reassigned to an employee being deleted."],
    [input.reassignTeamLeadsToManagerId, "Team Leads cannot be reassigned to a Manager being deleted."],
    [input.reassignLeadsToUserId, "Leads cannot be reassigned to an employee being deleted."],
  ];
  for (const [targetId, message] of pairs) {
    if (targetId && !isDirectAdminCallerReassignment(targetId) && deleting.has(targetId)) {
      throw new InvalidUserHierarchyError(message);
    }
  }
}

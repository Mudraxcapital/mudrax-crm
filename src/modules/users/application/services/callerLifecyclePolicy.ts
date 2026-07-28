// ============================================================================
// Optional Team Lead power to delete / disable / suspend assigned Callers.
// Granted per user by Admin or Manager — not every Team Lead has it.
// ============================================================================

import { hasPermission, type AuthorizationContext } from "@/modules/rbac";

export {
  assertActorGrantedCallerLifecycle,
  resolveCanManageCallerAccountsForUser,
} from "./callerManageGrant";

/** Admin / Manager (user.delete) or Team Lead with an explicit grant. */
export function canDeleteUserAccounts(context: AuthorizationContext): boolean {
  if (hasPermission(context, "user.delete")) return true;
  return (
    context.hierarchy.primaryRole === "Team Lead" && context.canManageCallerAccounts === true
  );
}

/** Who may disable / suspend / enable Caller accounts (scoped to hierarchy in use cases). */
export function canChangeCallerAccountStatus(context: AuthorizationContext): boolean {
  if (context.hierarchy.primaryRole === "Admin" || context.hierarchy.primaryRole === "Manager") {
    return hasPermission(context, "user.manage");
  }
  if (context.hierarchy.primaryRole === "Team Lead") {
    return context.canManageCallerAccounts === true;
  }
  return false;
}

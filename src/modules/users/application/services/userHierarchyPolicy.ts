// ============================================================================
// src/modules/users/application/services/userHierarchyPolicy.ts
//
// Hierarchical create / delete / visibility rules for Admin → Manager →
// Team Lead → Caller. Complements userRolePolicy (Admin protection).
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { FixedUserRole } from "../../domain/entities/User";
import {
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
} from "../../domain/errors/UserErrors";

export type HierarchyAction =
  | "view"
  | "edit"
  | "change_status"
  | "delete"
  | "reset_password";

/** Roles an actor may create under hierarchy rules. */
export function rolesActorMayCreate(
  actorRoles: string[],
  hierarchy: HierarchyScope,
): FixedUserRole[] {
  if (actorRoles.includes("Admin") || hierarchy.primaryRole === "Admin") {
    return ["Admin", "Manager", "Team Lead", "Caller"];
  }
  if (hierarchy.primaryRole === "Manager") {
    return ["Team Lead", "Caller"];
  }
  if (hierarchy.primaryRole === "Team Lead") {
    return ["Caller"];
  }
  return [];
}

export function assertCanCreateRole(
  actorRoles: string[],
  hierarchy: HierarchyScope,
  targetRole: FixedUserRole,
): void {
  const allowed = rolesActorMayCreate(actorRoles, hierarchy);
  if (!allowed.includes(targetRole)) {
    throw new InvalidUserHierarchyError(
      `${hierarchy.primaryRole ?? "User"} cannot assign role "${targetRole}".`,
    );
  }
}

/**
 * Validates / normalizes hierarchy edges on create.
 * - Team Lead must report to a Manager or Admin (forced to actor Manager when Manager creates).
 * - Caller must belong to a Team Lead (forced to self when Team Lead creates).
 */
export function normalizeHierarchyOnCreate(input: {
  role: FixedUserRole;
  hierarchy: HierarchyScope;
  actorUserId: string;
  assignedTeamLeadId?: string | null;
  reportingManagerId?: string | null;
}): { assignedTeamLeadId: string | null; reportingManagerId: string | null } {
  const { role, hierarchy, actorUserId } = input;

  if (role === "Team Lead") {
    const reportingManagerId =
      hierarchy.primaryRole === "Manager"
        ? actorUserId
        : (input.reportingManagerId ?? hierarchy.ownerManagerId);
    if (!reportingManagerId) {
      throw new InvalidUserHierarchyError("Team Lead must belong to exactly one Manager.");
    }
    return { assignedTeamLeadId: null, reportingManagerId };
  }

  if (role === "Caller") {
    const assignedTeamLeadId =
      hierarchy.primaryRole === "Team Lead"
        ? actorUserId
        : (input.assignedTeamLeadId ?? null);
    if (!assignedTeamLeadId) {
      throw new InvalidUserHierarchyError("Caller must belong to exactly one Team Lead.");
    }
    if (
      hierarchy.visibleUserIds &&
      !hierarchy.visibleUserIds.includes(assignedTeamLeadId) &&
      hierarchy.primaryRole !== "Admin"
    ) {
      throw new InvalidUserHierarchyError(
        "Caller must be assigned to a Team Lead inside your hierarchy.",
      );
    }
    return { assignedTeamLeadId, reportingManagerId: null };
  }

  if (role === "Manager" || role === "Admin") {
    return { assignedTeamLeadId: null, reportingManagerId: null };
  }

  return {
    assignedTeamLeadId: input.assignedTeamLeadId ?? null,
    reportingManagerId: input.reportingManagerId ?? null,
  };
}

/** Target must be visible in the actor's hierarchy tree (Admin unrestricted). */
export function assertCanViewHierarchyTarget(input: {
  hierarchy: HierarchyScope;
  targetUserId: string;
}): void {
  const { hierarchy, targetUserId } = input;
  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") return;
  if (!hierarchy.visibleUserIds?.includes(targetUserId)) {
    throw new InvalidUserHierarchyError("You can only view users in your hierarchy.");
  }
}

export function assertCanManageHierarchyTarget(input: {
  hierarchy: HierarchyScope;
  targetUserId: string;
}): void {
  const { hierarchy, targetUserId } = input;
  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") return;
  if (!hierarchy.visibleUserIds?.includes(targetUserId)) {
    throw new InvalidUserHierarchyError("You can only manage users in your hierarchy.");
  }
}

/**
 * Move rules: Admin may reassign freely; Manager may move own Team Leads / Callers
 * within their tree; Team Lead may only reassign their Callers to themselves.
 */
export function normalizeHierarchyOnUpdate(input: {
  role: FixedUserRole;
  hierarchy: HierarchyScope;
  actorUserId: string;
  assignedTeamLeadId?: string | null;
  reportingManagerId?: string | null;
}): { assignedTeamLeadId: string | null; reportingManagerId: string | null } {
  const normalized = normalizeHierarchyOnCreate(input);
  if (input.hierarchy.primaryRole === "Manager" && input.role === "Team Lead") {
    return { ...normalized, reportingManagerId: input.actorUserId };
  }
  if (input.hierarchy.primaryRole === "Team Lead" && input.role === "Caller") {
    return { ...normalized, assignedTeamLeadId: input.actorUserId };
  }
  return normalized;
}

/**
 * Shared authorization for view / edit / status / delete / password reset.
 * Creation uses rolesActorMayCreate; mutation of existing users uses this.
 */
export function assertCanActOnHierarchyTarget(input: {
  hierarchy: HierarchyScope;
  actorRoles: string[];
  actorUserId: string;
  targetUserId: string;
  targetRole: FixedUserRole | null;
  action: HierarchyAction;
}): void {
  const { hierarchy, actorRoles, actorUserId, targetUserId, targetRole, action } = input;

  if (actorUserId === targetUserId) {
    if (action === "view") return;
    if (action === "delete") {
      throw new InvalidUserHierarchyError("You cannot delete your own account.");
    }
    if (action === "change_status") {
      throw new InvalidUserHierarchyError("You cannot change your own account status.");
    }
    if (action === "reset_password") {
      throw new InvalidUserHierarchyError("You cannot reset your own password here.");
    }
    // edit self is allowed for profile fields; role/status blocked in updateUser.
    if (action === "edit") return;
  }

  if (targetRole === "Admin" && !actorRoles.includes("Admin")) {
    throw new AdminRoleProtectedError(
      action === "view"
        ? "Cannot view an Admin account."
        : `Cannot ${actionLabel(action)} an Admin.`,
    );
  }

  if (hierarchy.primaryRole === "Admin" || actorRoles.includes("Admin")) {
    return;
  }

  if (hierarchy.primaryRole === "Manager") {
    if (targetRole === "Manager" || targetRole === "Admin") {
      throw new InvalidUserHierarchyError(
        `Managers cannot ${actionLabel(action)} other Managers or Admins.`,
      );
    }
    if (!hierarchy.visibleUserIds?.includes(targetUserId)) {
      throw new InvalidUserHierarchyError(
        `You can only ${actionLabel(action)} users in your hierarchy.`,
      );
    }
    return;
  }

  if (hierarchy.primaryRole === "Team Lead") {
    if (targetRole !== "Caller" && targetUserId !== actorUserId) {
      throw new InvalidUserHierarchyError(
        `Team Leads can only ${actionLabel(action)} their own Callers.`,
      );
    }
    if (!hierarchy.visibleUserIds?.includes(targetUserId)) {
      throw new InvalidUserHierarchyError(
        `You can only ${actionLabel(action)} Callers assigned to you.`,
      );
    }
    return;
  }

  throw new InvalidUserHierarchyError(`You cannot ${actionLabel(action)} users.`);
}

/** @deprecated Prefer assertCanActOnHierarchyTarget — kept for call-site clarity. */
export function assertCanDeleteTarget(input: {
  hierarchy: HierarchyScope;
  actorRoles: string[];
  actorUserId: string;
  targetUserId: string;
  targetRole: FixedUserRole | null;
}): void {
  assertCanActOnHierarchyTarget({ ...input, action: "delete" });
}

function actionLabel(action: HierarchyAction): string {
  switch (action) {
    case "view":
      return "view";
    case "edit":
      return "edit";
    case "change_status":
      return "change the status of";
    case "delete":
      return "delete";
    case "reset_password":
      return "reset the password for";
  }
}

/** Reporting manager may be Manager or Admin (Admin sits above Managers). */
export function assertValidReportingManagerRole(role: FixedUserRole | null): void {
  if (role !== "Manager" && role !== "Admin") {
    throw new InvalidUserHierarchyError("Reporting Manager must be a Manager or Admin.");
  }
}

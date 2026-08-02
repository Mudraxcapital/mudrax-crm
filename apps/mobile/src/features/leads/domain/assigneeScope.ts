import type { AuthMe, UserListItem } from "@mudrax/types";

export type AssigneeFilterRole = "admin" | "manager" | "team_lead" | "caller" | "other";

export function resolveAssigneeFilterRole(me: AuthMe | null): AssigneeFilterRole {
  if (!me) return "other";
  if (me.isCallerWorkspace || me.hierarchy.primaryRole === "Caller") return "caller";
  const primary = me.hierarchy.primaryRole;
  if (primary === "Admin" || me.hierarchy.unrestricted) return "admin";
  if (primary === "Manager") return "manager";
  if (primary === "Team Lead") return "team_lead";

  const roleNames = new Set(me.roles.map((role) => role.name));
  if (roleNames.has("Admin")) return "admin";
  if (roleNames.has("Manager")) return "manager";
  if (roleNames.has("Team Lead")) return "team_lead";
  if (roleNames.has("Caller")) return "caller";
  return "other";
}

export function canShowAssigneeFilter(role: AssigneeFilterRole): boolean {
  return role === "admin" || role === "manager" || role === "team_lead";
}

/** Narrow assignees for the filter UI based on hierarchy role. */
export function filterAssigneesForRole(
  users: UserListItem[],
  role: AssigneeFilterRole,
  search: string,
): UserListItem[] {
  let scoped = users.filter((user) => user.status === "ACTIVE" || user.displayStatus === "ACTIVE");

  if (role === "team_lead") {
    scoped = scoped.filter((user) => user.roleName === "Caller");
  } else if (role === "manager" || role === "admin") {
    scoped = scoped.filter(
      (user) =>
        !user.roleName ||
        ["Caller", "Team Lead", "Manager", "Admin"].includes(user.roleName),
    );
  }

  const q = search.trim().toLowerCase();
  if (!q) return scoped;
  return scoped.filter(
    (user) =>
      user.fullName.toLowerCase().includes(q) ||
      (user.email ?? "").toLowerCase().includes(q) ||
      (user.employeeId ?? "").toLowerCase().includes(q),
  );
}

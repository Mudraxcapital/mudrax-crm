// ============================================================================
// CSV export of employees — Admin: all; Manager: hierarchy tree.
// ============================================================================

import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import { AdminRoleProtectedError } from "../../domain/errors/UserErrors";
import { accountDisplayStatus } from "../../domain/entities/User";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function makeExportUsers(repository: UserRepository) {
  return async function exportUsers(input: {
    actorRoles: string[];
    hierarchy: HierarchyScope;
    format: "csv" | "excel";
  }): Promise<{ filename: string; contentType: string; body: string }> {
    const isAdmin =
      input.actorRoles.includes("Admin") || input.hierarchy.primaryRole === "Admin";
    const isManager = input.hierarchy.primaryRole === "Manager";

    if (!isAdmin && !isManager) {
      throw new AdminRoleProtectedError("Only Admins and Managers can export users.");
    }

    const users = await repository.list({
      userIds: input.hierarchy.visibleUserIds ?? undefined,
    });

    const header = [
      "Employee ID",
      "Employee Name",
      "Email",
      "Phone",
      "Role",
      "Reporting To",
      "Status",
      "Last Login",
      "Created At",
    ];

    const lines = users.map((user) => {
      const reportingTo =
        user.roleName === "Caller"
          ? (user.assignedTeamLeadName ?? "")
          : user.roleName === "Team Lead"
            ? (user.reportingManagerName ?? "")
            : "";
      const status = accountDisplayStatus(user.status, user.lockedUntil);
      return [
        user.employeeId,
        user.fullName,
        user.email,
        user.phone ?? "",
        user.roleName ?? "",
        reportingTo,
        status === "INACTIVE" ? "Disabled" : status === "LOCKED" ? "Locked" : status,
        user.lastLoginAt ? user.lastLoginAt.toISOString() : "",
        user.createdAt.toISOString(),
      ]
        .map((cell) => csvEscape(String(cell)))
        .join(",");
    });

    const body = `\uFEFF${header.join(",")}\n${lines.join("\n")}\n`;
    const stamp = new Date().toISOString().slice(0, 10);
    if (input.format === "excel") {
      return {
        filename: `employees-${stamp}.xls`,
        contentType: "application/vnd.ms-excel;charset=utf-8",
        body,
      };
    }
    return {
      filename: `employees-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body,
    };
  };
}

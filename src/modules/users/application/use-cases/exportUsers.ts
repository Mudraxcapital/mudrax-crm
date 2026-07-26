// ============================================================================
// Employee export — Admin: all; Manager: hierarchy tree.
// CSV and real .xlsx (SheetJS).
// ============================================================================

import * as XLSX from "xlsx";
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

type ExportRow = {
  "Employee ID": string;
  "Employee Name": string;
  Email: string;
  Phone: string;
  Role: string;
  "Reporting To": string;
  Status: string;
  "Last Login": string;
  "Created At": string;
};

function buildRows(
  users: Awaited<ReturnType<UserRepository["list"]>>,
): ExportRow[] {
  return users.map((user) => {
    const reportingTo =
      user.roleName === "Caller"
        ? (user.assignedTeamLeadName ?? "")
        : user.roleName === "Team Lead"
          ? (user.reportingManagerName ?? "")
          : "";
    const status = accountDisplayStatus(user.status, user.lockedUntil);
    return {
      "Employee ID": user.employeeId,
      "Employee Name": user.fullName,
      Email: user.email,
      Phone: user.phone ?? "",
      Role: user.roleName ?? "",
      "Reporting To": reportingTo,
      Status: status === "INACTIVE" ? "Disabled" : status,
      "Last Login": user.lastLoginAt ? user.lastLoginAt.toISOString() : "",
      "Created At": user.createdAt.toISOString(),
    };
  });
}

export function makeExportUsers(repository: UserRepository) {
  return async function exportUsers(input: {
    actorRoles: string[];
    hierarchy: HierarchyScope;
    format: "csv" | "excel";
  }): Promise<{ filename: string; contentType: string; body: Buffer | string }> {
    const isAdmin =
      input.actorRoles.includes("Admin") || input.hierarchy.primaryRole === "Admin";
    const isManager = input.hierarchy.primaryRole === "Manager";

    if (!isAdmin && !isManager) {
      throw new AdminRoleProtectedError("Only Admins and Managers can export users.");
    }

    const users = await repository.list({
      userIds: input.hierarchy.visibleUserIds ?? undefined,
    });
    const rows = buildRows(users);
    const stamp = new Date().toISOString().slice(0, 10);

    if (input.format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
      const body = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
      return {
        filename: `employees-${stamp}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body,
      };
    }

    const header = Object.keys(rows[0] ?? {
      "Employee ID": "",
      "Employee Name": "",
      Email: "",
      Phone: "",
      Role: "",
      "Reporting To": "",
      Status: "",
      "Last Login": "",
      "Created At": "",
    });
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        header.map((key) => csvEscape(String(row[key as keyof ExportRow] ?? ""))).join(","),
      ),
    ];
    return {
      filename: `employees-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: `\uFEFF${lines.join("\n")}\n`,
    };
  };
}

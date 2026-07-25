"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, accountStatusLabel, accountStatusTone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import type { UserStatus } from "@/modules/users";
import {
  bulkDeleteUsersAction,
  bulkDisableUsersAction,
  bulkEnableUsersAction,
  bulkSuspendUsersAction,
  changeUserStatusAction,
  deleteUserAction,
  resetPasswordAction,
} from "@/modules/users/presentation/controllers/userActions.action";

export interface UserRow {
  id: string;
  fullName: string;
  employeeId: string;
  email: string;
  phone: string | null;
  roleName: string | null;
  status: string;
  displayStatus?: string;
  assignedTeamLeadId: string | null;
  assignedTeamLeadName: string | null;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  lastLoginAt: string | null;
  profilePhotoUrl: string | null;
}

type StatusDialogMode = "INACTIVE" | "SUSPENDED" | "ACTIVE";

function avatarFallback(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Reporting line shown in the list: Manager for Team Leads, Team Lead for Callers. */
function reportingTo(row: UserRow): string {
  if (row.roleName === "Caller") return row.assignedTeamLeadName ?? "—";
  if (row.roleName === "Team Lead") return row.reportingManagerName ?? "—";
  return "—";
}

export function UsersTable({
  rows,
  currentUserId,
  canManage,
  canDelete,
  canReset,
  roleFilterOptions,
  teamLeadOptions,
  managerOptions,
}: {
  rows: UserRow[];
  currentUserId: string;
  canManage: boolean;
  canDelete: boolean;
  canReset: boolean;
  roleFilterOptions: string[];
  teamLeadOptions: { id: string; fullName: string }[];
  managerOptions: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [search, setSearch] = useState("");
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetState, setResetState] = useState<{ error?: string; success?: string }>({});
  const [statusDialog, setStatusDialog] = useState<{
    userId: string;
    fullName: string;
    mode: StatusDialogMode;
  } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<UserRow | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (role && row.roleName !== role) return false;
      if (status && row.status !== status) return false;
      if (teamLeadId) {
        const lead = teamLeadOptions.find((option) => option.id === teamLeadId);
        if (!lead) return false;
        const isSelf = row.id === lead.id;
        const isCallerUnderLead = row.assignedTeamLeadId === lead.id;
        if (!isSelf && !isCallerUnderLead) return false;
      }
      if (managerId) {
        const manager = managerOptions.find((option) => option.id === managerId);
        if (!manager) return false;
        const isSelf = row.id === manager.id;
        const reportsToManager = row.reportingManagerId === manager.id;
        const callerUnderManagerTeam =
          row.roleName === "Caller" &&
          !!row.assignedTeamLeadId &&
          rows.some(
            (candidate) =>
              candidate.id === row.assignedTeamLeadId &&
              candidate.reportingManagerId === manager.id,
          );
        if (!isSelf && !reportsToManager && !callerUnderManagerTeam) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [row.fullName, row.employeeId, row.email, row.phone ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, role, status, teamLeadId, managerId, search, teamLeadOptions, managerOptions]);

  function openStatusDialog(row: UserRow, mode: StatusDialogMode) {
    setStatusDialog({ userId: row.id, fullName: row.fullName, mode });
    setStatusReason("");
  }

  function confirmStatusChange() {
    if (!statusDialog) return;
    const { userId, mode } = statusDialog;
    startTransition(async () => {
      const result = await changeUserStatusAction({
        userId,
        status: mode as UserStatus,
        reason: statusReason.trim() || undefined,
        forceLogout: true,
      });
      setMessage(result.error ?? result.success ?? null);
      setStatusDialog(null);
      router.refresh();
    });
  }

  const columns: DataColumn<UserRow>[] = [
    {
      id: "profile",
      header: "Profile",
      accessor: (r) => r.fullName,
      cell: (r) => {
        const src = r.profilePhotoUrl
          ? r.profilePhotoUrl.startsWith("storage:")
            ? `/api/users/${r.id}/photo`
            : r.profilePhotoUrl
          : null;
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <div className="bg-accent/15 text-accent flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
            {avatarFallback(r.fullName)}
          </div>
        );
      },
      sortable: false,
      minWidth: 72,
    },
    {
      id: "fullName",
      header: "Employee Name",
      accessor: (r) => r.fullName,
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
      minWidth: 160,
    },
    {
      id: "employeeId",
      header: "Employee ID",
      accessor: (r) => r.employeeId,
      cell: (r) => <span className="font-mono text-xs">{r.employeeId}</span>,
      minWidth: 110,
    },
    {
      id: "role",
      header: "Role",
      accessor: (r) => r.roleName,
      cell: (r) => <Badge tone="neutral">{r.roleName ?? "—"}</Badge>,
      minWidth: 110,
    },
    {
      id: "reportingTo",
      header: "Reporting To",
      accessor: (r) => reportingTo(r),
      minWidth: 150,
    },
    { id: "phone", header: "Phone", accessor: (r) => r.phone, minWidth: 120 },
    { id: "email", header: "Email", accessor: (r) => r.email, minWidth: 180 },
    {
      id: "status",
      header: "Status",
      accessor: (r) => r.status,
      cell: (r) => {
        const status = r.displayStatus ?? r.status;
        return (
          <Badge tone={accountStatusTone(status)} dot>
            {accountStatusLabel(status)}
          </Badge>
        );
      },
      minWidth: 110,
    },
    {
      id: "lastLoginAt",
      header: "Last Login",
      accessor: (r) => r.lastLoginAt,
      cell: (r) => (r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : "—"),
      minWidth: 150,
    },
    {
      id: "actions",
      header: "Actions",
      accessor: () => "",
      filterable: false,
      sortable: false,
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <Link href={`/users/${r.id}`} className="mx-btn mx-btn-ghost mx-btn-sm">
            View
          </Link>
          {canManage ? (
            <Link href={`/users/${r.id}/edit`} className="mx-btn mx-btn-ghost mx-btn-sm">
              Edit
            </Link>
          ) : null}
          {canReset && r.roleName !== "Admin" && r.id !== currentUserId ? (
            <button
              type="button"
              className="mx-btn mx-btn-ghost mx-btn-sm"
              onClick={(event) => {
                event.stopPropagation();
                setResetUserId(r.id);
                setResetState({});
              }}
            >
              Reset Password
            </button>
          ) : null}
          {canManage && r.status !== "ACTIVE" ? (
            <button
              type="button"
              className="mx-btn mx-btn-ghost mx-btn-sm"
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                openStatusDialog(r, "ACTIVE");
              }}
            >
              Enable
            </button>
          ) : null}
          {canManage && r.status !== "INACTIVE" ? (
            <button
              type="button"
              className="mx-btn mx-btn-ghost mx-btn-sm"
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                openStatusDialog(r, "INACTIVE");
              }}
            >
              Disable
            </button>
          ) : null}
          {canManage && r.status !== "SUSPENDED" ? (
            <button
              type="button"
              className="mx-btn mx-btn-ghost mx-btn-sm"
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                openStatusDialog(r, "SUSPENDED");
              }}
            >
              Suspend
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="mx-btn mx-btn-ghost mx-btn-sm text-danger"
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                setReassignTo("");
                setDeleteDialog(r);
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      ),
      minWidth: 340,
    },
  ];

  function runBulk(action: (ids: string[]) => Promise<{ error?: string; success?: string }>) {
    if (selected.length === 0) return;
    startTransition(async () => {
      const result = await action(selected);
      setMessage(result.error ?? result.success ?? null);
      setSelected([]);
      router.refresh();
    });
  }

  const dialogTitle =
    statusDialog?.mode === "ACTIVE"
      ? "Enable account"
      : statusDialog?.mode === "SUSPENDED"
        ? "Suspend account"
        : "Disable account";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs">
          <span className="text-muted">Search</span>
          <input
            className="mx-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, employee ID, phone, or email"
          />
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
          <span className="text-muted">Role</span>
          <select className="mx-input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">All roles</option>
            {roleFilterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
          <span className="text-muted">Status</span>
          <select
            className="mx-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Disabled</option>
          </select>
        </label>
        <label className="flex min-w-[11rem] flex-col gap-1 text-xs">
          <span className="text-muted">Reporting Manager</span>
          <select
            className="mx-input"
            value={managerId}
            onChange={(event) => setManagerId(event.target.value)}
          >
            <option value="">All managers</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[11rem] flex-col gap-1 text-xs">
          <span className="text-muted">Team Lead</span>
          <select
            className="mx-input"
            value={teamLeadId}
            onChange={(event) => setTeamLeadId(event.target.value)}
          >
            <option value="">All team leads</option>
            {teamLeadOptions.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? (
        <p className="rounded-md border border-border bg-surface-sunken/50 px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        searchable={false}
        emptyTitle="No employees found"
        emptyDescription="Adjust search or filters, or create a new employee."
        onRowOpen={(row) => router.push(`/users/${row.id}`)}
        selectable={canManage || canDelete}
        onSelectionChange={setSelected}
        toolbar={
          canManage || canDelete ? (
            <div className="flex flex-wrap gap-2">
              {canManage ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={pending || selected.length === 0}
                    onClick={() => runBulk(bulkEnableUsersAction)}
                  >
                    Bulk Enable
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pending || selected.length === 0}
                    onClick={() => runBulk(bulkDisableUsersAction)}
                  >
                    Bulk Disable
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pending || selected.length === 0}
                    onClick={() => runBulk(bulkSuspendUsersAction)}
                  >
                    Bulk Suspend
                  </Button>
                </>
              ) : null}
              {canDelete ? (
                <Button
                  variant="danger"
                  disabled={pending || selected.length === 0}
                  onClick={() => {
                    if (!confirm(`Delete ${selected.length} selected employee(s)?`)) return;
                    runBulk(bulkDeleteUsersAction);
                  }}
                >
                  Bulk Delete
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      <Dialog
        open={!!resetUserId}
        onClose={() => setResetUserId(null)}
        title="Reset password"
        description="Set a temporary password. The employee must change it on next login. All of their sessions end immediately. Admins cannot be reset here."
      >
        {resetUserId ? (
          <form
            className="flex flex-col gap-3"
            action={async (formData) => {
              const result = await resetPasswordAction(resetUserId, undefined, formData);
              setResetState(result);
              if (result.success) router.refresh();
            }}
          >
            {resetState.error ? <p className="text-sm text-danger">{resetState.error}</p> : null}
            {resetState.success ? (
              <p className="text-sm text-success">{resetState.success}</p>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="mx-label">Temporary password</span>
              <input name="password" type="password" required minLength={8} className="mx-input" />
              <span className="text-muted text-xs">
                At least 8 characters with uppercase, lowercase, and a number. Employee must change
                it on next login.
              </span>
            </label>
            <Button type="submit">Reset password</Button>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={!!statusDialog}
        onClose={() => setStatusDialog(null)}
        title={dialogTitle}
        description={
          statusDialog
            ? `${dialogTitle.replace(" account", "")} ${statusDialog.fullName}. Active sessions will end immediately.`
            : undefined
        }
      >
        {statusDialog ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="mx-label">Reason (optional)</span>
              <textarea
                className="mx-input min-h-[4rem]"
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                placeholder="Optional note for the audit log"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setStatusDialog(null)}>
                Cancel
              </Button>
              <Button
                variant={statusDialog.mode === "ACTIVE" ? "primary" : "danger"}
                disabled={pending}
                onClick={confirmStatusChange}
              >
                {statusDialog.mode === "ACTIVE"
                  ? "Enable"
                  : statusDialog.mode === "SUSPENDED"
                    ? "Suspend"
                    : "Disable"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        title="Delete employee"
        description={
          deleteDialog?.roleName === "Team Lead"
            ? (() => {
                const callerCount = rows.filter(
                  (row) => row.assignedTeamLeadId === deleteDialog.id,
                ).length;
                return callerCount > 0
                  ? `${deleteDialog.fullName} has ${callerCount} Caller(s). Reassign them before deleting.`
                  : `Permanently delete ${deleteDialog.fullName}?`;
              })()
            : deleteDialog?.roleName === "Manager"
              ? "Managers with Team Leads cannot be deleted until those Team Leads are reassigned."
              : deleteDialog
                ? `Permanently delete ${deleteDialog.fullName}?`
                : undefined
        }
      >
        {deleteDialog ? (
          <div className="flex flex-col gap-3">
            {deleteDialog.roleName === "Team Lead" &&
            rows.some((row) => row.assignedTeamLeadId === deleteDialog.id) ? (
              <label className="flex flex-col gap-1.5">
                <span className="mx-label">Reassign Callers to *</span>
                <select
                  className="mx-input"
                  value={reassignTo}
                  onChange={(event) => setReassignTo(event.target.value)}
                >
                  <option value="">Select Team Lead…</option>
                  {teamLeadOptions
                    .filter((lead) => lead.id !== deleteDialog.id)
                    .map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.fullName}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={
                  pending ||
                  (deleteDialog.roleName === "Team Lead" &&
                    rows.some((row) => row.assignedTeamLeadId === deleteDialog.id) &&
                    !reassignTo)
                }
                onClick={() => {
                  const target = deleteDialog;
                  const needsReassign =
                    target.roleName === "Team Lead" &&
                    rows.some((row) => row.assignedTeamLeadId === target.id);
                  setDeleteDialog(null);
                  startTransition(async () => {
                    const result = await deleteUserAction(
                      target.id,
                      needsReassign ? reassignTo : null,
                    );
                    setMessage(result.error ?? result.success ?? null);
                    router.refresh();
                  });
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, accountStatusLabel, accountStatusTone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import type { UserStatus } from "@/modules/users/domain/entities/User";
import {
  DIRECT_ADMIN_REASSIGN_LABEL,
  REASSIGN_CALLERS_TO_DIRECT_ADMIN,
} from "@/modules/users/presentation/constants/callerReassignment";
import { profilePhotoSrc } from "@/modules/users/presentation/lib/profilePhotoUrl";
import {
  bulkDeleteUsersAction,
  bulkDisableUsersAction,
  bulkEnableUsersAction,
  bulkSuspendUsersAction,
  changeUserStatusAction,
  deleteUserAction,
  getUserDeleteCountsAction,
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
  leadCount: number;
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

/** Reporting line shown in the list: Manager for Team Leads, Team Lead / Direct Admin for Callers. */
function reportingTo(row: UserRow): string {
  if (row.roleName === "Caller") {
    return row.assignedTeamLeadName?.trim() ? row.assignedTeamLeadName : "Direct Admin";
  }
  if (row.roleName === "Team Lead") return row.reportingManagerName ?? "—";
  return "—";
}

export function UsersTable({
  rows,
  currentUserId,
  canManage,
  canDelete,
  canChangeStatus,
  canReset,
  allowDirectAdminReassign,
  roleFilterOptions,
  teamLeadOptions,
  managerOptions,
  leadAssigneeOptions = [],
}: {
  rows: UserRow[];
  currentUserId: string;
  canManage: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  canReset: boolean;
  allowDirectAdminReassign: boolean;
  roleFilterOptions: string[];
  teamLeadOptions: { id: string; fullName: string }[];
  managerOptions: { id: string; fullName: string }[];
  /** ACTIVE employees eligible to receive reassigned Leads. */
  leadAssigneeOptions?: { id: string; fullName: string; roleName: string | null }[];
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
    /** Current status when opening the dialog (for Enable vs Unsuspend copy). */
    fromStatus?: string;
  } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<UserRow | null>(null);
  const [deleteLeadCount, setDeleteLeadCount] = useState(0);
  const [deleteFollowUpCount, setDeleteFollowUpCount] = useState(0);
  const [deleteCampaignCount, setDeleteCampaignCount] = useState(0);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignManagerTo, setReassignManagerTo] = useState("");
  const [reassignLeadsTo, setReassignLeadsTo] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDetails, setBulkDetails] = useState<string[] | null>(null);

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.includes(row.id)),
    [rows, selected],
  );

  const bulkNeedsCallerReassign = useMemo(
    () =>
      selectedRows.some(
        (row) =>
          row.roleName === "Team Lead" &&
          rows.some((candidate) => candidate.assignedTeamLeadId === row.id),
      ),
    [rows, selectedRows],
  );

  const bulkNeedsManagerReassign = useMemo(
    () =>
      selectedRows.some(
        (row) =>
          row.roleName === "Manager" &&
          rows.some((candidate) => candidate.reportingManagerId === row.id),
      ),
    [rows, selectedRows],
  );

  const bulkNeedsLeadReassign = useMemo(
    () => selectedRows.some((row) => row.leadCount > 0),
    [selectedRows],
  );

  const bulkSelectedLeadCount = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.leadCount, 0),
    [selectedRows],
  );

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
    setStatusDialog({
      userId: row.id,
      fullName: row.fullName,
      mode,
      fromStatus: row.status,
    });
    setStatusReason("");
  }

  function confirmStatusChange() {
    if (!statusDialog) return;
    const { userId, mode, fromStatus } = statusDialog;
    const defaultReason =
      mode === "ACTIVE" && fromStatus === "SUSPENDED" ? "Unsuspended by administrator" : undefined;
    startTransition(async () => {
      const result = await changeUserStatusAction({
        userId,
        status: mode as UserStatus,
        reason: statusReason.trim() || defaultReason,
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
        const src = profilePhotoSrc(r.id, r.profilePhotoUrl);
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
      header: "Name",
      accessor: (r) => r.fullName,
      cell: (r) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium">{r.fullName}</span>
          <span className="text-muted font-mono text-[11px]">ID: {r.employeeId}</span>
        </div>
      ),
      minWidth: 180,
    },
    {
      id: "role",
      header: "Role",
      accessor: (r) => r.roleName,
      cell: (r) => <Badge tone="neutral">{r.roleName ?? "—"}</Badge>,
      minWidth: 110,
    },
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
    { id: "phone", header: "Phone", accessor: (r) => r.phone, minWidth: 120 },
    { id: "email", header: "Email", accessor: (r) => r.email, minWidth: 180 },
    {
      id: "reportingTo",
      header: "Reporting To",
      accessor: (r) => reportingTo(r),
      minWidth: 150,
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
          {canChangeStatus && r.id !== currentUserId && r.status === "INACTIVE" ? (
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
          {canChangeStatus && r.id !== currentUserId && r.status === "SUSPENDED" ? (
            <button
              type="button"
              className="mx-btn mx-btn-ghost mx-btn-sm"
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                openStatusDialog(r, "ACTIVE");
              }}
            >
              Unsuspend
            </button>
          ) : null}
          {canChangeStatus && r.id !== currentUserId && r.status === "ACTIVE" ? (
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
          {canChangeStatus && r.id !== currentUserId && r.status === "ACTIVE" ? (
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
          {canDelete && r.id !== currentUserId ? (
            <button
              type="button"
              className="mx-btn mx-btn-ghost mx-btn-sm text-danger"
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                setReassignTo("");
                setReassignManagerTo("");
                setReassignLeadsTo("");
                setDeleteLeadCount(r.leadCount);
                setDeleteFollowUpCount(0);
                setDeleteCampaignCount(0);
                setDeleteDialog(r);
                startTransition(async () => {
                  const counts = await getUserDeleteCountsAction(r.id);
                  setDeleteLeadCount(counts.leadCount);
                  setDeleteFollowUpCount(counts.followUpCount);
                  setDeleteCampaignCount(counts.campaignCount);
                });
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
      ? statusDialog.fromStatus === "SUSPENDED"
        ? "Unsuspend account"
        : "Enable account"
      : statusDialog?.mode === "SUSPENDED"
        ? "Suspend account"
        : "Disable account";

  const dialogConfirmLabel =
    statusDialog?.mode === "ACTIVE"
      ? statusDialog.fromStatus === "SUSPENDED"
        ? "Unsuspend"
        : "Enable"
      : statusDialog?.mode === "SUSPENDED"
        ? "Suspend"
        : "Disable";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs">
          <span className="text-muted">Search</span>
          <input
            className="mx-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, email, or employee ID"
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
        selectable={canManage || canDelete || canChangeStatus}
        onSelectionChange={setSelected}
        toolbar={
          canChangeStatus || canDelete ? (
            <div className="flex flex-wrap gap-2">
              {canChangeStatus ? (
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
                    setReassignTo("");
                    setReassignManagerTo("");
                    setReassignLeadsTo("");
                    setBulkDetails(null);
                    setBulkDeleteOpen(true);
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
        description="Set a new password the employee can use immediately. All of their sessions end immediately. Admins cannot be reset here."
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
              <span className="mx-label">New password</span>
              <input name="password" type="password" required minLength={8} className="mx-input" />
              <span className="text-muted text-xs">
                At least 8 characters with uppercase, lowercase, and a number. No forced change on
                next login.
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
                {dialogConfirmLabel}
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
          deleteDialog
            ? `Permanently delete ${deleteDialog.fullName}? Reassign hierarchy and Leads first when required.`
            : undefined
        }
      >
        {deleteDialog ? (
          <div className="flex flex-col gap-3">
            {(() => {
              const needsCallerReassign =
                deleteDialog.roleName === "Team Lead" &&
                rows.some((row) => row.assignedTeamLeadId === deleteDialog.id);
              const needsManagerReassign =
                deleteDialog.roleName === "Manager" &&
                (rows.some((row) => row.reportingManagerId === deleteDialog.id) ||
                  deleteCampaignCount > 0);
              const needsLeadReassign = deleteLeadCount > 0 || deleteFollowUpCount > 0;
              const workloadLabel = [
                deleteLeadCount > 0 ? `${deleteLeadCount} Lead(s)` : null,
                deleteFollowUpCount > 0 ? `${deleteFollowUpCount} Follow-up(s)` : null,
              ]
                .filter(Boolean)
                .join(" and ");

              return (
                <>
            {needsCallerReassign ? (
              <label className="flex flex-col gap-1.5">
                <span className="mx-label">Reassign Callers to *</span>
                <select
                  className="mx-input"
                  value={reassignTo}
                  onChange={(event) => setReassignTo(event.target.value)}
                >
                  <option value="">Select Team Lead…</option>
                  {allowDirectAdminReassign ? (
                    <option value={REASSIGN_CALLERS_TO_DIRECT_ADMIN}>
                      {DIRECT_ADMIN_REASSIGN_LABEL}
                    </option>
                  ) : null}
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
            {needsManagerReassign ? (
              <label className="flex flex-col gap-1.5">
                <span className="mx-label">
                  Reassign Team Leads / Campaigns to *
                  {deleteCampaignCount > 0 ? ` (${deleteCampaignCount} campaign(s))` : ""}
                </span>
                <select
                  className="mx-input"
                  value={reassignManagerTo}
                  onChange={(event) => setReassignManagerTo(event.target.value)}
                >
                  <option value="">Select Manager…</option>
                  {managerOptions
                    .filter((manager) => manager.id !== deleteDialog.id)
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.fullName}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            {needsLeadReassign ? (
            <label className="flex flex-col gap-1.5">
              <span className="mx-label">Reassign {workloadLabel} to *</span>
              <select
                className="mx-input"
                value={reassignLeadsTo}
                onChange={(event) => setReassignLeadsTo(event.target.value)}
              >
                <option value="">Select employee…</option>
                {leadAssigneeOptions
                  .filter((user) => user.id !== deleteDialog.id)
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                      {user.roleName ? ` (${user.roleName})` : ""}
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
                  (needsCallerReassign && !reassignTo) ||
                  (needsManagerReassign && !reassignManagerTo) ||
                  (needsLeadReassign && !reassignLeadsTo)
                }
                onClick={() => {
                  const target = deleteDialog;
                  setDeleteDialog(null);
                  startTransition(async () => {
                    const result = await deleteUserAction(target.id, {
                      reassignCallersToTeamLeadId: needsCallerReassign ? reassignTo : null,
                      reassignTeamLeadsToManagerId: needsManagerReassign
                        ? reassignManagerTo
                        : null,
                      reassignLeadsToUserId: needsLeadReassign ? reassignLeadsTo : null,
                    });
                    setMessage(result.error ?? result.success ?? null);
                    router.refresh();
                  });
                }}
              >
                Delete
              </Button>
            </div>
                </>
              );
            })()}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Bulk delete employees"
        description={`Delete ${selected.length} selected employee(s). Provide reassignment targets when any selection owns Callers, Team Leads, or Leads.`}
      >
        <div className="flex flex-col gap-3">
          {bulkNeedsCallerReassign ? (
          <label className="flex flex-col gap-1.5">
            <span className="mx-label">Reassign Callers to (Team Leads) *</span>
            <select
              className="mx-input"
              value={reassignTo}
              onChange={(event) => setReassignTo(event.target.value)}
            >
              <option value="">Select Team Lead…</option>
              {allowDirectAdminReassign ? (
                <option value={REASSIGN_CALLERS_TO_DIRECT_ADMIN}>
                  {DIRECT_ADMIN_REASSIGN_LABEL}
                </option>
              ) : null}
              {teamLeadOptions
                .filter((lead) => !selected.includes(lead.id))
                .map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.fullName}
                  </option>
                ))}
            </select>
          </label>
          ) : null}
          {bulkNeedsManagerReassign ? (
          <label className="flex flex-col gap-1.5">
            <span className="mx-label">Reassign Team Leads to (Managers) *</span>
            <select
              className="mx-input"
              value={reassignManagerTo}
              onChange={(event) => setReassignManagerTo(event.target.value)}
            >
              <option value="">Select Manager…</option>
              {managerOptions
                .filter((manager) => !selected.includes(manager.id))
                .map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </option>
                ))}
            </select>
          </label>
          ) : null}
          {bulkNeedsLeadReassign ? (
          <label className="flex flex-col gap-1.5">
            <span className="mx-label">
              Reassign assigned Leads to * ({bulkSelectedLeadCount} total across selection)
            </span>
            <select
              className="mx-input"
              value={reassignLeadsTo}
              onChange={(event) => setReassignLeadsTo(event.target.value)}
            >
              <option value="">Select employee…</option>
              {leadAssigneeOptions
                .filter((user) => !selected.includes(user.id))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                    {user.roleName ? ` (${user.roleName})` : ""}
                  </option>
                ))}
            </select>
          </label>
          ) : null}
          {bulkDetails && bulkDetails.length > 0 ? (
            <ul className="text-danger max-h-32 list-disc overflow-y-auto pl-5 text-xs">
              {bulkDetails.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={
                pending ||
                selected.length === 0 ||
                (bulkNeedsCallerReassign && !reassignTo) ||
                (bulkNeedsManagerReassign && !reassignManagerTo) ||
                (bulkNeedsLeadReassign && !reassignLeadsTo)
              }
              onClick={() => {
                startTransition(async () => {
                  const result = await bulkDeleteUsersAction({
                    userIds: selected,
                    reassignCallersToTeamLeadId: reassignTo || undefined,
                    reassignTeamLeadsToManagerId: reassignManagerTo || undefined,
                    reassignLeadsToUserId: reassignLeadsTo || undefined,
                  });
                  setMessage(result.error ?? result.success ?? null);
                  setBulkDetails(result.details ?? null);
                  if (!result.error) {
                    setBulkDeleteOpen(false);
                    setSelected([]);
                  }
                  router.refresh();
                });
              }}
            >
              Delete selected
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

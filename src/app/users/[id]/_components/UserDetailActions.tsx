"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import type { ActionResult } from "@/modules/users/presentation/controllers/userActions.action";
import {
  disableUserAction,
  enableUserAction,
  suspendUserAction,
  unsuspendUserAction,
} from "@/modules/users/presentation/controllers/userActions.action";
import {
  DIRECT_ADMIN_REASSIGN_LABEL,
  REASSIGN_CALLERS_TO_DIRECT_ADMIN,
} from "@/modules/users/presentation/constants/callerReassignment";

export function UserDetailActions({
  userId,
  status,
  roleName,
  canDelete,
  canChangeStatus,
  canReset,
  allowDirectAdminReassign,
  isSelf,
  teamLeadOptions,
  managerOptions,
  leadAssigneeOptions,
  callerCount,
  teamLeadCount,
  campaignCount,
  leadCount,
  followUpCount,
  deleteAction,
  resetPasswordAction,
}: {
  userId: string;
  status: string;
  roleName: string | null;
  canManage: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  canReset: boolean;
  allowDirectAdminReassign: boolean;
  isSelf: boolean;
  teamLeadOptions: { id: string; fullName: string; employeeId: string }[];
  managerOptions: { id: string; fullName: string; employeeId: string }[];
  leadAssigneeOptions: { id: string; fullName: string; roleName: string | null }[];
  callerCount: number;
  teamLeadCount: number;
  campaignCount: number;
  leadCount: number;
  followUpCount: number;
  deleteAction: (
    userId: string,
    options?: {
      reassignCallersToTeamLeadId?: string | null;
      reassignTeamLeadsToManagerId?: string | null;
      reassignLeadsToUserId?: string | null;
    },
  ) => Promise<ActionResult>;
  resetPasswordAction: (
    userId: string,
    state: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignManagerTo, setReassignManagerTo] = useState("");
  const [reassignLeadsTo, setReassignLeadsTo] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState<"INACTIVE" | "SUSPENDED" | null>(null);
  const [reason, setReason] = useState("");
  const boundReset = resetPasswordAction.bind(null, userId);
  const [resetState, resetFormAction, resetPending] = useActionState(boundReset, {});

  const needsCallerReassign = roleName === "Team Lead" && callerCount > 0;
  const needsManagerReassign =
    roleName === "Manager" && (teamLeadCount > 0 || campaignCount > 0);
  const needsLeadReassign = leadCount > 0 || followUpCount > 0;
  const reassignmentTargets = useMemo(
    () => teamLeadOptions.filter((lead) => lead.id !== userId),
    [teamLeadOptions, userId],
  );
  const managerTargets = useMemo(
    () => managerOptions.filter((manager) => manager.id !== userId),
    [managerOptions, userId],
  );

  function run(action: () => Promise<ActionResult>, redirectToUsers = false) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setActionError(null);
      if (redirectToUsers) router.push("/users");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        {canReset && roleName !== "Admin" && !isSelf ? (
          <Button variant="secondary" onClick={() => setResetOpen(true)}>
            Reset Password
          </Button>
        ) : null}
        {canChangeStatus && !isSelf && status === "INACTIVE" ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => enableUserAction(userId))}
          >
            Enable
          </Button>
        ) : null}
        {canChangeStatus && !isSelf && status === "SUSPENDED" ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => unsuspendUserAction(userId))}
          >
            Unsuspend
          </Button>
        ) : null}
        {canChangeStatus && !isSelf && status === "ACTIVE" ? (
          <Button variant="secondary" disabled={pending} onClick={() => setReasonOpen("INACTIVE")}>
            Disable
          </Button>
        ) : null}
        {canChangeStatus && !isSelf && status === "ACTIVE" ? (
          <Button variant="secondary" disabled={pending} onClick={() => setReasonOpen("SUSPENDED")}>
            Suspend
          </Button>
        ) : null}
        {canDelete && !isSelf ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setReassignTo("");
              setReassignManagerTo("");
              setReassignLeadsTo("");
              setDeleteOpen(true);
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset password"
        description="Set a new password the employee can use immediately. All sessions end immediately."
      >
        <form action={resetFormAction} className="flex flex-col gap-3">
          {resetState.error ? <p className="text-sm text-danger">{resetState.error}</p> : null}
          {resetState.success ? <p className="text-sm text-success">{resetState.success}</p> : null}
          <label className="flex flex-col gap-1.5">
            <span className="mx-label">New password</span>
            <input name="password" type="password" required minLength={8} className="mx-input" />
            <span className="text-muted text-xs">
              At least 8 characters with uppercase, lowercase, and a number. No forced change on next
              login.
            </span>
          </label>
          <Button type="submit" disabled={resetPending}>
            {resetPending ? "Saving…" : "Reset password"}
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete employee"
        description="Reassign hierarchy and Leads before permanent deletion."
      >
        <div className="flex flex-col gap-3">
          {needsCallerReassign ? (
            <label className="flex flex-col gap-1.5">
              <span className="mx-label">Reassign Callers to *</span>
              <select
                className="mx-input"
                value={reassignTo}
                onChange={(event) => setReassignTo(event.target.value)}
                required
              >
                <option value="">Select Team Lead…</option>
                {allowDirectAdminReassign ? (
                  <option value={REASSIGN_CALLERS_TO_DIRECT_ADMIN}>
                    {DIRECT_ADMIN_REASSIGN_LABEL}
                  </option>
                ) : null}
                {reassignmentTargets.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {needsManagerReassign ? (
            <label className="flex flex-col gap-1.5">
              <span className="mx-label">Reassign Team Leads to *</span>
              <select
                className="mx-input"
                value={reassignManagerTo}
                onChange={(event) => setReassignManagerTo(event.target.value)}
                required
              >
                <option value="">Select Manager…</option>
                {managerTargets.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {needsLeadReassign ? (
            <label className="flex flex-col gap-1.5">
              <span className="mx-label">Reassign {leadCount} Lead(s) to *</span>
              <select
                className="mx-input"
                value={reassignLeadsTo}
                onChange={(event) => setReassignLeadsTo(event.target.value)}
                required
              >
                <option value="">Select employee…</option>
                {leadAssigneeOptions
                  .filter((user) => user.id !== userId)
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
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
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
                setDeleteOpen(false);
                run(
                  () =>
                    deleteAction(userId, {
                      reassignCallersToTeamLeadId: needsCallerReassign ? reassignTo : null,
                      reassignTeamLeadsToManagerId: needsManagerReassign
                        ? reassignManagerTo
                        : null,
                      reassignLeadsToUserId: needsLeadReassign ? reassignLeadsTo : null,
                    }),
                  true,
                );
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!reasonOpen}
        onClose={() => setReasonOpen(null)}
        title={reasonOpen === "SUSPENDED" ? "Suspend account" : "Disable account"}
        description="Optionally add a reason. Active sessions will be force-logged out."
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="mx-label">Reason (optional)</span>
            <textarea
              className="mx-input min-h-[4.5rem]"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReasonOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const mode = reasonOpen;
                setReasonOpen(null);
                if (mode === "SUSPENDED") {
                  run(() => suspendUserAction(userId, reason.trim() || undefined));
                } else {
                  run(() => disableUserAction(userId, reason.trim() || undefined, true));
                }
                setReason("");
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

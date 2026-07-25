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
} from "@/modules/users/presentation/controllers/userActions.action";

export function UserDetailActions({
  userId,
  status,
  roleName,
  canManage,
  canDelete,
  canReset,
  isSelf,
  teamLeadOptions,
  callerCount,
  deleteAction,
  resetPasswordAction,
}: {
  userId: string;
  status: string;
  roleName: string | null;
  canManage: boolean;
  canDelete: boolean;
  canReset: boolean;
  isSelf: boolean;
  teamLeadOptions: { id: string; fullName: string; employeeId: string }[];
  callerCount: number;
  deleteAction: (
    userId: string,
    reassignCallersToTeamLeadId?: string | null,
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState<"INACTIVE" | "SUSPENDED" | null>(null);
  const [reason, setReason] = useState("");
  const boundReset = resetPasswordAction.bind(null, userId);
  const [resetState, resetFormAction, resetPending] = useActionState(boundReset, {});

  const needsCallerReassign = roleName === "Team Lead" && callerCount > 0;
  const reassignmentTargets = useMemo(
    () => teamLeadOptions.filter((lead) => lead.id !== userId),
    [teamLeadOptions, userId],
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
        {canManage && status !== "ACTIVE" ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => enableUserAction(userId))}
          >
            Enable
          </Button>
        ) : null}
        {canManage && status !== "INACTIVE" ? (
          <Button variant="secondary" disabled={pending} onClick={() => setReasonOpen("INACTIVE")}>
            Disable
          </Button>
        ) : null}
        {canManage && status !== "SUSPENDED" ? (
          <Button variant="secondary" disabled={pending} onClick={() => setReasonOpen("SUSPENDED")}>
            Suspend
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setReassignTo("");
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
        description="Set a temporary password. The employee must change it on next login. All sessions end immediately."
      >
        <form action={resetFormAction} className="flex flex-col gap-3">
          {resetState.error ? <p className="text-sm text-danger">{resetState.error}</p> : null}
          {resetState.success ? <p className="text-sm text-success">{resetState.success}</p> : null}
          <label className="flex flex-col gap-1.5">
            <span className="mx-label">Temporary password</span>
            <input name="password" type="password" required minLength={8} className="mx-input" />
            <span className="text-muted text-xs">
              At least 8 characters with uppercase, lowercase, and a number.
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
        description={
          needsCallerReassign
            ? `This Team Lead has ${callerCount} Caller(s). Reassign them before deleting.`
            : roleName === "Manager"
              ? "Managers with Team Leads cannot be deleted until those Team Leads are reassigned."
              : "This permanently deletes the employee account."
        }
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
                {reassignmentTargets.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.fullName} ({lead.employeeId})
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
              disabled={pending || (needsCallerReassign && !reassignTo)}
              onClick={() => {
                setDeleteOpen(false);
                run(
                  () => deleteAction(userId, needsCallerReassign ? reassignTo : null),
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

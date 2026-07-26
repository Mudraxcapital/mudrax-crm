"use client";

import { useActionState, useState, type ReactNode } from "react";
import { FIXED_USER_ROLES, USER_STATUSES } from "../../domain/entities/User";
import type { UserDto } from "../../application/dto/UserDto";
import type { UserFormState } from "../controllers/updateUser.action";
import type { HierarchyOption } from "./UserForm";

const inputClass = "mx-input";

export function EditUserForm({
  user,
  action,
  teamLeads,
  managers,
  leadAssigneeOptions = [],
  allowAdminRole,
  allowedRoles,
  isSelf = false,
  callerCount = 0,
  teamLeadCount = 0,
  leadCount = 0,
}: {
  user: UserDto;
  action: (state: UserFormState | undefined, formData: FormData) => Promise<UserFormState>;
  teamLeads: HierarchyOption[];
  managers: HierarchyOption[];
  leadAssigneeOptions?: { id: string; fullName: string; roleName: string | null }[];
  allowAdminRole: boolean;
  allowedRoles?: readonly string[];
  isSelf?: boolean;
  callerCount?: number;
  teamLeadCount?: number;
  leadCount?: number;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [role, setRole] = useState(user.roleName ?? "Caller");
  const roles = (allowedRoles?.length ? allowedRoles : FIXED_USER_ROLES).filter(
    (name) => allowAdminRole || name !== "Admin",
  );

  /** Email is Admin-only and never editable on self. */
  const canEditEmail = allowAdminRole && !isSelf;
  const roleChanged = !isSelf && role !== (user.roleName ?? "Caller");
  const demotingTeamLead =
    roleChanged && user.roleName === "Team Lead" && role !== "Team Lead" && callerCount > 0;
  const demotingManager =
    roleChanged && user.roleName === "Manager" && role !== "Manager" && teamLeadCount > 0;
  const needsLeadReassign = roleChanged && leadCount > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {state.success}
        </p>
      ) : null}

      <div className="rounded-md border border-border bg-surface-sunken/40 px-3 py-2 text-sm">
        <span className="text-muted">Employee ID </span>
        <span className="font-mono font-medium">{user.employeeId}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee name *" htmlFor="fullName">
          <input
            id="fullName"
            name="fullName"
            required
            defaultValue={user.fullName}
            className={inputClass}
          />
        </Field>
        <Field label="Email *" htmlFor="email">
          {canEditEmail ? (
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
              className={inputClass}
            />
          ) : (
            <>
              <input
                id="email"
                className={inputClass}
                value={user.email}
                disabled
                readOnly
              />
              <p className="text-muted text-xs">
                {isSelf
                  ? "Ask an Admin to change your email via User Management."
                  : "Only Admins can change employee email addresses."}
              </p>
            </>
          )}
        </Field>
        <Field label="Phone *" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={user.phone ?? ""}
            className={inputClass}
          />
        </Field>
        {!isSelf ? (
          <Field label="Role *" htmlFor="role">
            <select
              id="role"
              name="role"
              className={inputClass}
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {roles.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Role" htmlFor="roleDisplay">
            <input
              id="roleDisplay"
              className={inputClass}
              value={user.roleName ?? "—"}
              disabled
              readOnly
            />
          </Field>
        )}
        {!isSelf ? (
          <Field label="Account status *" htmlFor="status">
            <select id="status" name="status" className={inputClass} defaultValue={user.status}>
              {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === "INACTIVE" ? "Disabled" : status === "ACTIVE" ? "Active" : "Suspended"}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Account status" htmlFor="statusDisplay">
            <input
              id="statusDisplay"
              className={inputClass}
              value={
                user.status === "INACTIVE"
                  ? "Disabled"
                  : user.status === "SUSPENDED"
                    ? "Suspended"
                    : "Active"
              }
              disabled
              readOnly
            />
          </Field>
        )}
      </div>

      {!isSelf && role === "Caller" ? (
        <Field label="Assigned team lead *" htmlFor="assignedTeamLeadId">
          <select
            id="assignedTeamLeadId"
            name="assignedTeamLeadId"
            required
            className={inputClass}
            defaultValue={user.assignedTeamLeadId ?? ""}
          >
            <option value="">Select team lead…</option>
            {teamLeads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.fullName} ({lead.employeeId})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {!isSelf && role === "Team Lead" ? (
        <Field label="Reporting manager *" htmlFor="reportingManagerId">
          <select
            id="reportingManagerId"
            name="reportingManagerId"
            required
            className={inputClass}
            defaultValue={user.reportingManagerId ?? ""}
          >
            <option value="">Select manager…</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName} ({manager.employeeId})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {demotingTeamLead ? (
        <Field label="Reassign Callers to *" htmlFor="reassignCallersToTeamLeadId">
          <select
            id="reassignCallersToTeamLeadId"
            name="reassignCallersToTeamLeadId"
            required
            className={inputClass}
            defaultValue=""
          >
            <option value="">Select Team Lead…</option>
            {teamLeads
              .filter((lead) => lead.id !== user.id)
              .map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.fullName} ({lead.employeeId})
                </option>
              ))}
          </select>
          <p className="text-muted text-xs">
            {callerCount} Caller(s) must be transferred before this role change.
          </p>
        </Field>
      ) : null}

      {demotingManager ? (
        <Field label="Reassign Team Leads to *" htmlFor="reassignTeamLeadsToManagerId">
          <select
            id="reassignTeamLeadsToManagerId"
            name="reassignTeamLeadsToManagerId"
            required
            className={inputClass}
            defaultValue=""
          >
            <option value="">Select Manager…</option>
            {managers
              .filter((manager) => manager.id !== user.id)
              .map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName} ({manager.employeeId})
                </option>
              ))}
          </select>
          <p className="text-muted text-xs">
            {teamLeadCount} Team Lead(s) must be transferred before this role change.
          </p>
        </Field>
      ) : null}

      {needsLeadReassign ? (
        <Field label="Reassign assigned Leads to *" htmlFor="reassignLeadsToUserId">
          <select
            id="reassignLeadsToUserId"
            name="reassignLeadsToUserId"
            required
            className={inputClass}
            defaultValue=""
          >
            <option value="">Select employee…</option>
            {leadAssigneeOptions
              .filter((option) => option.id !== user.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
                  {option.roleName ? ` (${option.roleName})` : ""}
                </option>
              ))}
          </select>
          <p className="text-muted text-xs">
            {leadCount} Lead(s) must be transferred before this role change.
          </p>
        </Field>
      ) : null}

      <button type="submit" className="mx-btn mx-btn-primary" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="mx-label">
        {label}
      </label>
      {children}
    </div>
  );
}

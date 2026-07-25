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
  allowAdminRole,
  allowedRoles,
}: {
  user: UserDto;
  action: (state: UserFormState | undefined, formData: FormData) => Promise<UserFormState>;
  teamLeads: HierarchyOption[];
  managers: HierarchyOption[];
  allowAdminRole: boolean;
  allowedRoles?: readonly string[];
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [role, setRole] = useState(user.roleName ?? "Caller");
  const roles = (allowedRoles?.length ? allowedRoles : FIXED_USER_ROLES).filter(
    (name) => allowAdminRole || name !== "Admin",
  );

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
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={user.email}
            className={inputClass}
          />
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
        <Field label="Account status *" htmlFor="status">
          <select id="status" name="status" className={inputClass} defaultValue={user.status}>
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "INACTIVE" ? "Disabled" : status === "ACTIVE" ? "Active" : "Suspended"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {role === "Caller" ? (
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

      {role === "Team Lead" ? (
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

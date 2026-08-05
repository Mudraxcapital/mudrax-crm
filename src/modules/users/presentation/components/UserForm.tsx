"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { CreateUserFormAction, UserFormState } from "../controllers/createUser.action";
import { FIXED_USER_ROLES, USER_STATUSES } from "../../domain/entities/User";
import { CallerReportingFields } from "./CallerReportingFields";

const initialState: UserFormState = {};
const inputClass = "mx-input";

export interface HierarchyOption {
  id: string;
  fullName: string;
  employeeId: string;
}

export function UserForm({
  action,
  teamLeads,
  managers,
  allowAdminRole,
  allowedRoles,
  defaultReportingManagerId,
  defaultAssignedTeamLeadId,
  allowGrantCallerLifecycle = false,
}: {
  action: CreateUserFormAction;
  teamLeads: HierarchyOption[];
  managers: HierarchyOption[];
  allowAdminRole: boolean;
  allowedRoles?: readonly string[];
  defaultReportingManagerId?: string;
  defaultAssignedTeamLeadId?: string;
  allowGrantCallerLifecycle?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const roles = (allowedRoles?.length ? allowedRoles : FIXED_USER_ROLES).filter(
    (name) => allowAdminRole || name !== "Admin",
  );
  const [role, setRole] = useState<string>(roles[0] ?? "Caller");
  const [status, setStatus] = useState<string>("ACTIVE");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <p className="text-muted text-xs">
        Employee ID is generated automatically (MCS0001, MCS0002, …). Hierarchy: Admin → Manager →
        Team Lead → Caller. Admins may also create Direct Admin Callers (freelancers).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee name *" htmlFor="fullName">
          <input id="fullName" name="fullName" required maxLength={200} className={inputClass} />
        </Field>
        <Field label="Email *" htmlFor="email">
          <input id="email" name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Phone *" htmlFor="phone">
          <input id="phone" name="phone" type="tel" required className={inputClass} />
        </Field>
        <Field label="Password *" htmlFor="password">
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
          />
          <p className="text-muted text-xs">
            At least 8 characters with uppercase, lowercase, and a number. Managers, Team Leads, and
            Callers must change this temporary password on first sign-in.
          </p>
        </Field>
        <Field label="Role *" htmlFor="role">
          <select
            id="role"
            name="role"
            required
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
          <select
            id="status"
            name="status"
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {USER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value === "INACTIVE" ? "Disabled" : value === "ACTIVE" ? "Active" : "Suspended"}
              </option>
            ))}
          </select>
          {status !== "ACTIVE" ? (
            <p className="text-warning text-xs">
              This employee will not be able to sign in until the account is activated.
            </p>
          ) : null}
        </Field>
      </div>

      {role === "Caller" ? (
        <CallerReportingFields
          teamLeads={teamLeads}
          allowDirectAdmin={allowAdminRole}
          defaultAssignedTeamLeadId={defaultAssignedTeamLeadId}
        />
      ) : null}

      {role === "Team Lead" ? (
        <Field label="Reporting manager *" htmlFor="reportingManagerId">
          <select
            id="reportingManagerId"
            name="reportingManagerId"
            required={!defaultReportingManagerId}
            className={inputClass}
            defaultValue={defaultReportingManagerId ?? ""}
          >
            <option value="">Select manager…</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {allowGrantCallerLifecycle && role === "Team Lead" ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="canManageCallerAccounts" className="mt-0.5" />
          <span>
            <span className="font-medium">Caller account management</span>
            <span className="text-muted block text-xs">
              Allow this Team Lead to delete, disable, or suspend their assigned Callers.
            </span>
          </span>
        </label>
      ) : null}

      <button type="submit" className="mx-btn mx-btn-primary" disabled={isPending}>
        {isPending ? "Creating…" : "Create employee"}
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

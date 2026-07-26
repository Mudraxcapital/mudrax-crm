"use client";

import { useState, type ReactNode } from "react";
import type { HierarchyOption } from "./UserForm";

const inputClass = "mx-input";

type ReportingMode = "team_lead" | "direct_admin";

/**
 * Caller reporting controls.
 * - Everyone: can place a Caller under a Team Lead.
 * - Admin only: can mark the Caller as Direct Admin (freelancer / no Team Lead).
 */
export function CallerReportingFields({
  teamLeads,
  allowDirectAdmin,
  defaultAssignedTeamLeadId,
  defaultDirectAdmin = false,
}: {
  teamLeads: HierarchyOption[];
  allowDirectAdmin: boolean;
  defaultAssignedTeamLeadId?: string | null;
  defaultDirectAdmin?: boolean;
}) {
  const [mode, setMode] = useState<ReportingMode>(
    allowDirectAdmin && defaultDirectAdmin ? "direct_admin" : "team_lead",
  );

  if (!allowDirectAdmin) {
    return (
      <Field label="Assigned team lead *" htmlFor="assignedTeamLeadId">
        <select
          id="assignedTeamLeadId"
          name="assignedTeamLeadId"
          required
          className={inputClass}
          defaultValue={defaultAssignedTeamLeadId ?? ""}
        >
          <option value="">Select team lead…</option>
          {teamLeads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.fullName}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-border px-3 py-3">
      <legend className="mx-label px-1">Reports to *</legend>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="callerReportingMode"
          value="team_lead"
          checked={mode === "team_lead"}
          onChange={() => setMode("team_lead")}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Under Team Lead</span>
          <span className="text-muted block text-xs">
            Standard hierarchy — Manager → Team Lead → Caller.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="callerReportingMode"
          value="direct_admin"
          checked={mode === "direct_admin"}
          onChange={() => setMode("direct_admin")}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Directly Under Admin (Freelancer)</span>
          <span className="text-muted block text-xs">
            Independent agent — visible and managed only by Admin. No Team Lead or Manager.
          </span>
        </span>
      </label>

      {mode === "team_lead" ? (
        <Field label="Assigned team lead *" htmlFor="assignedTeamLeadId">
          <select
            id="assignedTeamLeadId"
            name="assignedTeamLeadId"
            required
            className={inputClass}
            defaultValue={defaultAssignedTeamLeadId ?? ""}
          >
            <option value="">Select team lead…</option>
            {teamLeads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.fullName}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="assignedTeamLeadId" value="" />
      )}
    </fieldset>
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

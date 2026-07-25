"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadForm.tsx
//
// Create form for the Lead aggregate. Field inputs are driven by Field Settings.
// ============================================================================

import { useActionState } from "react";
import type { LeadSource } from "../../domain/entities/LeadCatalogs";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import type { LeadFormState } from "../controllers/createLead.action";
import { DynamicLeadFields } from "./DynamicLeadFields";

const initialState: LeadFormState = {};

type CreateLeadFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

const inputClass = "mx-input";

export function LeadForm({
  action,
  customers,
  sources,
  assignees,
  fields,
}: {
  action: CreateLeadFormAction;
  customers: { id: string; fullName: string }[];
  sources: LeadSource[];
  assignees: { id: string; fullName: string }[];
  fields: LeadFieldDefinitionDto[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="customerId" className="mx-label">
          Customer
        </label>
        <select id="customerId" name="customerId" required className={inputClass}>
          <option value="">— Select a Customer —</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.fullName}
            </option>
          ))}
        </select>
      </div>

      <DynamicLeadFields fields={fields} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="leadSourceId" className="mx-label">
          Lead Source
        </label>
        <select id="leadSourceId" name="leadSourceId" required className={inputClass}>
          <option value="">— Select a Source —</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentAssigneeUserId" className="mx-label">
          Assign to (optional)
        </label>
        <select id="currentAssigneeUserId" name="currentAssigneeUserId" className={inputClass}>
          <option value="">— Unassigned —</option>
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </select>
      </div>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="mx-btn mx-btn-primary mt-1">
        {isPending ? "Saving…" : "Create Lead"}
      </button>
    </form>
  );
}

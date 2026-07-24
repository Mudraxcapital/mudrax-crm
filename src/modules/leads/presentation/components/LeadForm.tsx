"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadForm.tsx
//
// Create form for the Lead aggregate. `customers`, `sources`, and `assignees`
// are fetched by the page (this module has no authority to list Customers or
// Users itself) and rendered as selects.
// ============================================================================

import { useActionState } from "react";
import type { LeadSource } from "../../domain/entities/LeadCatalogs";
import type { LeadFormState } from "../controllers/createLead.action";

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
}: {
  action: CreateLeadFormAction;
  customers: { id: string; fullName: string }[];
  sources: LeadSource[];
  assignees: { id: string; fullName: string }[];
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullNameSnapshot" className="mx-label">
          Lead name
        </label>
        <input
          id="fullNameSnapshot"
          name="fullNameSnapshot"
          type="text"
          required
          maxLength={200}
          placeholder="Rahul Sharma"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phoneSnapshot" className="mx-label">
            Phone
          </label>
          <input
            id="phoneSnapshot"
            name="phoneSnapshot"
            type="tel"
            placeholder="+919876543210"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emailSnapshot" className="mx-label">
            Email
          </label>
          <input
            id="emailSnapshot"
            name="emailSnapshot"
            type="email"
            placeholder="rahul.sharma@example.com"
            className={inputClass}
          />
        </div>
      </div>

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

      <button
        type="submit"
        disabled={isPending}
        className="mx-btn mx-btn-primary mt-1"
      >
        {isPending ? "Saving…" : "Create Lead"}
      </button>
    </form>
  );
}

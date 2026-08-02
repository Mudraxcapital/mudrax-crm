"use client";

// ============================================================================
// src/modules/telephony/presentation/components/ClickToCallForm.tsx
//
// Click-to-Call form. Web CRM prompts users to place calls from the mobile app.
// ============================================================================

import { useCallback, useState } from "react";
import type { TelephonyFormState } from "../controllers/initiateClickToCall.action";
import { MobileAppCallRequiredDialog } from "./MobileAppCallRequiredDialog";

type ClickToCallFormAction = (
  state: TelephonyFormState | undefined,
  formData: FormData,
) => Promise<TelephonyFormState>;

const inputClass = "mx-input";

export function ClickToCallForm({
  action: _action,
  leads,
  customers,
  assignees,
}: {
  action: ClickToCallFormAction;
  leads: { id: string; label: string }[];
  customers: { id: string; label: string }[];
  assignees: { id: string; fullName: string }[];
}) {
  void _action;
  const [dialogOpen, setDialogOpen] = useState(false);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leadId" className="mx-label">
            Lead (optional)
          </label>
          <select id="leadId" name="leadId" className={inputClass} defaultValue="">
            <option value="">— None —</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="customerId" className="mx-label">
            Customer (optional)
          </label>
          <select id="customerId" name="customerId" className={inputClass} defaultValue="">
            <option value="">— None —</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-muted text-xs">At least one of Lead / Customer is required.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="toPhoneNumber" className="mx-label">
            Phone number (optional)
          </label>
          <input
            id="toPhoneNumber"
            name="toPhoneNumber"
            type="tel"
            maxLength={20}
            placeholder="+919876543210"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="agentUserId" className="mx-label">
            Assign to Agent (optional)
          </label>
          <select id="agentUserId" name="agentUserId" className={inputClass} defaultValue="">
            <option value="">— Me —</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        className="bg-foreground text-background mt-1 self-start rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity"
        onClick={() => setDialogOpen(true)}
      >
        Click to Call
      </button>
      <MobileAppCallRequiredDialog open={dialogOpen} onClose={closeDialog} />
    </div>
  );
}

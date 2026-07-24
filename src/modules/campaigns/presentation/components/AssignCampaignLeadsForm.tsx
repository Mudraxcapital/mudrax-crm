"use client";

// ============================================================================
// src/modules/campaigns/presentation/components/AssignCampaignLeadsForm.tsx
//
// Triggers a Campaign Assignment allocation run: pick unassigned Leads and
// an allocation method (EQUAL splits by member weight; PERCENTAGE lets the
// operator set each active member's share explicitly).
// ============================================================================

import { useActionState, useState } from "react";
import type { CampaignFormState } from "../controllers/createCampaign.action";
import type { AllocationMethod } from "../../domain/entities/CampaignAssignment";

const initialState: CampaignFormState = {};

type AssignLeadsFormAction = (
  state: CampaignFormState | undefined,
  formData: FormData,
) => Promise<CampaignFormState>;

const inputClass = "mx-input";

export function AssignCampaignLeadsForm({
  action,
  leads,
  members,
}: {
  action: AssignLeadsFormAction;
  leads: { id: string; fullNameSnapshot: string; currentStageName: string }[];
  members: { userId: string; fullName: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>("EQUAL");

  if (leads.length === 0) {
    return (
      <p className="text-muted text-sm">No unassigned Leads are available to allocate.</p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-muted text-sm">Add an active member before assigning Leads.</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="mx-label">Leads to assign</span>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3">
          {leads.map((lead) => (
            <label key={lead.id} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" name="leadIds" value={lead.id} />
              {lead.fullNameSnapshot}{" "}
              <span className="text-muted">({lead.currentStageName})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="mx-label">Allocation method</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="allocationMethod"
              value="EQUAL"
              checked={allocationMethod === "EQUAL"}
              onChange={() => setAllocationMethod("EQUAL")}
            />
            Equal (by member weight)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="allocationMethod"
              value="PERCENTAGE"
              checked={allocationMethod === "PERCENTAGE"}
              onChange={() => setAllocationMethod("PERCENTAGE")}
            />
            Percentage
          </label>
        </div>
      </div>

      {allocationMethod === "PERCENTAGE" ? (
        <div className="flex flex-col gap-2">
          <span className="mx-label">
            Percentages (must sum to 100)
          </span>
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3">
              <span className="w-40 text-sm">{member.fullName}</span>
              <input
                type="number"
                name={`percentage_${member.userId}`}
                min={0}
                max={100}
                step={1}
                className={`${inputClass} w-24`}
              />
              <span className="text-muted text-sm">%</span>
            </div>
          ))}
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Assigning…" : "Run Assignment"}
      </button>
    </form>
  );
}

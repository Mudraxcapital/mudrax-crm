"use client";

// ============================================================================
// src/modules/campaigns/presentation/components/AssignCampaignLeadsForm.tsx
//
// Triggers a Campaign Assignment allocation run with Equal, Round Robin,
// Random, Percentage, or Manual strategies. Supports redistribution of
// already-assigned Leads.
// ============================================================================

import { useActionState, useMemo, useState } from "react";
import type { CampaignFormState } from "../controllers/createCampaign.action";
import type { AllocationMethod } from "../../domain/entities/CampaignAssignment";

const initialState: CampaignFormState = {};

type AssignLeadsFormAction = (
  state: CampaignFormState | undefined,
  formData: FormData,
) => Promise<CampaignFormState>;

const METHODS: Array<{ value: AllocationMethod; label: string; help: string }> = [
  {
    value: "ROUND_ROBIN",
    label: "Round Robin",
    help: "Lead1 → Agent A, Lead2 → Agent B, Lead3 → Agent C, then repeat.",
  },
  {
    value: "EQUAL",
    label: "Equal Distribution",
    help: "Split leads as evenly as possible (respects member weights).",
  },
  {
    value: "RANDOM",
    label: "Random Distribution",
    help: "Random order, then balanced round-robin so counts stay even.",
  },
  {
    value: "PERCENTAGE",
    label: "Percentage",
    help: "Set an explicit percentage share per agent (must sum to 100).",
  },
  {
    value: "MANUAL",
    label: "Manual Assignment",
    help: "Assign all selected leads to one agent.",
  },
];

export function AssignCampaignLeadsForm({
  action,
  leads,
  members,
  allowRedistribution = true,
}: {
  action: AssignLeadsFormAction;
  leads: {
    id: string;
    fullNameSnapshot: string;
    currentStageName: string;
    assigned: boolean;
  }[];
  members: { userId: string; fullName: string }[];
  allowRedistribution?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>("ROUND_ROBIN");
  const [includeAssigned, setIncludeAssigned] = useState(false);

  const visibleLeads = useMemo(
    () => (includeAssigned || !allowRedistribution ? leads : leads.filter((lead) => !lead.assigned)),
    [allowRedistribution, includeAssigned, leads],
  );

  if (leads.length === 0) {
    return (
      <p className="text-muted text-sm">No Leads are available on this Campaign to allocate.</p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-muted text-sm">Add an active member before assigning Leads.</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {allowRedistribution ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeAssigned}
            onChange={(event) => setIncludeAssigned(event.target.checked)}
          />
          Include already-assigned Leads (redistribute)
        </label>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <span className="mx-label">Leads to assign</span>
        {visibleLeads.length === 0 ? (
          <p className="text-muted text-sm">
            No unassigned Leads. Enable redistribution to reassign existing ones.
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3">
            {visibleLeads.map((lead) => (
              <label key={lead.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" name="leadIds" value={lead.id} defaultChecked={!lead.assigned} />
                {lead.fullNameSnapshot}{" "}
                <span className="text-muted">
                  ({lead.currentStageName}
                  {lead.assigned ? " · assigned" : ""})
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="mx-label">Distribution strategy</span>
        <div className="flex flex-col gap-2 text-sm">
          {METHODS.map((method) => (
            <label
              key={method.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3"
            >
              <input
                type="radio"
                name="allocationMethod"
                value={method.value}
                checked={allocationMethod === method.value}
                onChange={() => setAllocationMethod(method.value)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{method.label}</span>
                <span className="text-muted mt-0.5 block text-xs">{method.help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {allocationMethod === "PERCENTAGE" ? (
        <div className="flex flex-col gap-2">
          <span className="mx-label">Percentages (must sum to 100)</span>
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3">
              <span className="w-40 text-sm">{member.fullName}</span>
              <input
                type="number"
                name={`percentage_${member.userId}`}
                min={0}
                max={100}
                step={1}
                className="mx-input w-24"
              />
              <span className="text-muted text-sm">%</span>
            </div>
          ))}
        </div>
      ) : null}

      {allocationMethod === "MANUAL" ? (
        <label className="text-sm">
          Assign selected Leads to
          <select name="manualAssigneeUserId" required className="mx-input mt-1 w-full">
            <option value="">Select agent…</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || visibleLeads.length === 0}
        className="mx-btn mx-btn-primary self-start"
      >
        {isPending ? "Assigning…" : includeAssigned ? "Redistribute Leads" : "Run Assignment"}
      </button>
    </form>
  );
}

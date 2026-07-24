"use client";

// ============================================================================
// src/modules/campaigns/presentation/components/CampaignStatusForm.tsx
//
// Inline Campaign Status transition control on the Campaign detail page.
// ============================================================================

import { useActionState } from "react";
import type { CampaignFormState } from "../controllers/createCampaign.action";
import { CAMPAIGN_STATUS_TRANSITIONS, type CampaignStatus } from "../../domain/entities/Campaign";

const initialState: CampaignFormState = {};

type ChangeStatusFormAction = (
  state: CampaignFormState | undefined,
  formData: FormData,
) => Promise<CampaignFormState>;

const inputClass = "mx-input";

export function CampaignStatusForm({
  action,
  currentStatus,
}: {
  action: ChangeStatusFormAction;
  currentStatus: CampaignStatus;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const allowed = CAMPAIGN_STATUS_TRANSITIONS[currentStatus];

  if (allowed.length === 0) {
    return (
      <p className="text-muted text-sm">No further status transitions are available.</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="status" className="mx-label">
          New status
        </label>
        <select id="status" name="status" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            — Select a status —
          </option>
          {allowed.map((status) => (
            <option key={status} value={status}>
              {status}
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
        className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Updating…" : "Update Status"}
      </button>
    </form>
  );
}

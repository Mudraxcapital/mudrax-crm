"use client";

// ============================================================================
// src/modules/campaigns/presentation/components/EditCampaignForm.tsx
//
// Edit form for the Campaign aggregate's editable fields.
// ============================================================================

import { useActionState } from "react";
import type { CampaignFormState } from "../controllers/createCampaign.action";
import type { CampaignDto } from "../../application/dto/CampaignDto";

const initialState: CampaignFormState = {};

type CampaignFormAction = (
  state: CampaignFormState | undefined,
  formData: FormData,
) => Promise<CampaignFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function EditCampaignForm({
  action,
  campaign,
}: {
  action: CampaignFormAction;
  campaign: CampaignDto;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground/80 text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={200}
          defaultValue={campaign.name}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-foreground/80 text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={4000}
          defaultValue={campaign.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-foreground/80 text-sm font-medium">
            Start date (optional)
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={campaign.startDate ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-foreground/80 text-sm font-medium">
            End date (optional)
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={campaign.endDate ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}

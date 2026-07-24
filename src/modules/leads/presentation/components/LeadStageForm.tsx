"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadStageForm.tsx
//
// Inline Lead Stage-change control on the Lead detail page. `lostReasons`
// is always passed (rendered conditionally client-side) since the target
// Stage's bucket/closeOutcome is only known once the Caller picks it.
// ============================================================================

import { useActionState, useState } from "react";
import type { LeadStage, LostReason } from "../../domain/entities/LeadCatalogs";
import type { LeadFormState } from "../controllers/createLead.action";

const initialState: LeadFormState = {};

type ChangeLeadStageFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function LeadStageForm({
  action,
  currentStageId,
  stages,
  lostReasons,
}: {
  action: ChangeLeadStageFormAction;
  currentStageId: string;
  stages: LeadStage[];
  lostReasons: LostReason[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedStageId, setSelectedStageId] = useState(currentStageId);
  const selectedStage = stages.find((stage) => stage.id === selectedStageId);
  const needsLostReason =
    selectedStage?.bucket === "CLOSED" && selectedStage.closeOutcome === "LOST";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stageId" className="text-foreground/80 text-sm font-medium">
          Stage
        </label>
        <select
          id="stageId"
          name="stageId"
          value={selectedStageId}
          onChange={(event) => setSelectedStageId(event.target.value)}
          className={inputClass}
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      {needsLostReason ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lostReasonId" className="text-foreground/80 text-sm font-medium">
            Lost Reason
          </label>
          <select id="lostReasonId" name="lostReasonId" required className={inputClass}>
            <option value="">— Select a reason —</option>
            {lostReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || selectedStageId === currentStageId}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Updating…" : "Update Stage"}
      </button>
    </form>
  );
}

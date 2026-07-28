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

const inputClass = "mx-input";

export function LeadStageForm({
  action,
  currentStageId,
  stages,
  lostReasons,
  disabled = false,
  disabledHint,
}: {
  action: ChangeLeadStageFormAction;
  currentStageId: string;
  stages: LeadStage[];
  lostReasons: LostReason[];
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedStageId, setSelectedStageId] = useState(currentStageId);
  const selectedStage = stages.find((stage) => stage.id === selectedStageId);
  const needsLostReason =
    selectedStage?.bucket === "CLOSED" && selectedStage.closeOutcome === "LOST";

  const freshStages = stages.filter((stage) => stage.bucket === "INITIAL");
  const activeStages = stages.filter((stage) => stage.bucket === "ACTIVE");
  const closedStages = stages.filter((stage) => stage.bucket === "CLOSED");
  const useGroups =
    freshStages.length + activeStages.length + closedStages.length === stages.length &&
    (freshStages.length > 0 || activeStages.length > 0 || closedStages.length > 0);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {disabled && disabledHint ? (
        <p className="text-muted text-sm">{disabledHint}</p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stageId" className="mx-label">
          Status
        </label>
        <select
          id="stageId"
          name="stageId"
          value={selectedStageId}
          onChange={(event) => setSelectedStageId(event.target.value)}
          className={inputClass}
          disabled={disabled || isPending}
        >
          {useGroups ? (
            <>
              {freshStages.length > 0 ? (
                <optgroup label="Fresh">
                  {freshStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {activeStages.length > 0 ? (
                <optgroup label="Active">
                  {activeStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {closedStages.length > 0 ? (
                <optgroup label="Closed">
                  {closedStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </>
          ) : (
            stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))
          )}
        </select>
      </div>

      {needsLostReason ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lostReasonId" className="mx-label">
            Lost Reason
          </label>
          <select
            id="lostReasonId"
            name="lostReasonId"
            required
            className={inputClass}
            disabled={disabled || isPending}
          >
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
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={disabled || isPending || selectedStageId === currentStageId}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Updating…" : "Update Stage"}
      </button>
    </form>
  );
}

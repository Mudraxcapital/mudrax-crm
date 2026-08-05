"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadStageForm.tsx
//
// Inline Lead Stage-change control (campaign dashboard / caller workspace /
// lead detail). Lost Reason + note render when the target Stage is Closed-Lost.
// Do Not Disturb requires a compulsory note.
// ============================================================================

import { useActionState, useMemo, useState } from "react";
import type { LeadStage, LostReason } from "../../domain/entities/LeadCatalogs";
import type { LeadFormState } from "../controllers/createLead.action";
import { filterClosedLeadStagesForPicker } from "../lib/filterClosedLeadStages";
import { isDoNotDisturbStageName } from "../../application/lib/doNotDisturbPolicy";
import { isFollowUpStageName } from "../../application/lib/followUpStagePolicy";

const initialState: LeadFormState = {};

type ChangeLeadStageFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

const inputClass = "mx-input";

function StageOption({ stage }: { stage: LeadStage }) {
  const bold = isDoNotDisturbStageName(stage.name);
  return (
    <option value={stage.id} className={bold ? "font-bold" : undefined} style={bold ? { fontWeight: 700 } : undefined}>
      {stage.name}
    </option>
  );
}

export function LeadStageForm({
  action,
  currentStageId,
  stages,
  lostReasons,
  disabled = false,
  disabledHint,
  requireFollowUpSchedule = false,
}: {
  action: ChangeLeadStageFormAction;
  currentStageId: string;
  stages: LeadStage[];
  lostReasons: LostReason[];
  disabled?: boolean;
  disabledHint?: string;
  /** When true, selecting a Follow Up stage requires scheduling details. */
  requireFollowUpSchedule?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedStageId, setSelectedStageId] = useState(currentStageId);
  const pickerStages = useMemo(
    () => filterClosedLeadStagesForPicker(stages, currentStageId),
    [stages, currentStageId],
  );
  const selectedStage = pickerStages.find((stage) => stage.id === selectedStageId);
  const needsLostReason =
    selectedStage?.bucket === "CLOSED" && selectedStage.closeOutcome === "LOST";
  const needsDndNote = Boolean(selectedStage && isDoNotDisturbStageName(selectedStage.name));
  const needsFollowUpSchedule = Boolean(
    requireFollowUpSchedule &&
      selectedStage &&
      isFollowUpStageName(selectedStage.name) &&
      selectedStageId !== currentStageId,
  );
  const needsNote = needsLostReason || needsDndNote;

  const freshStages = pickerStages.filter((stage) => stage.bucket === "INITIAL");
  const activeStages = pickerStages.filter((stage) => stage.bucket === "ACTIVE");
  const closedStages = pickerStages.filter((stage) => stage.bucket === "CLOSED");
  const useGroups =
    freshStages.length + activeStages.length + closedStages.length === pickerStages.length &&
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
          className={`${inputClass}${needsDndNote ? " font-bold" : ""}`}
          disabled={disabled || isPending}
        >
          {useGroups ? (
            <>
              {freshStages.length > 0 ? (
                <optgroup label="Fresh">
                  {freshStages.map((stage) => (
                    <StageOption key={stage.id} stage={stage} />
                  ))}
                </optgroup>
              ) : null}
              {activeStages.length > 0 ? (
                <optgroup label="Active">
                  {activeStages.map((stage) => (
                    <StageOption key={stage.id} stage={stage} />
                  ))}
                </optgroup>
              ) : null}
              {closedStages.length > 0 ? (
                <optgroup label="Closed">
                  {closedStages.map((stage) => (
                    <StageOption key={stage.id} stage={stage} />
                  ))}
                </optgroup>
              ) : null}
            </>
          ) : (
            pickerStages.map((stage) => <StageOption key={stage.id} stage={stage} />)
          )}
        </select>
        {needsDndNote ? (
          <p className="text-muted text-xs">
            <span className="font-bold">Do Not Disturb</span> moves this lead into the Do Not
            Disturb campaign.
          </p>
        ) : null}
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

      {needsNote ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="mx-label">
            {needsDndNote ? "Do Not Disturb note" : "Lost note"}{" "}
            <span className="text-danger">*</span>
          </label>
          <textarea
            id="note"
            name="note"
            required
            minLength={1}
            maxLength={4000}
            rows={3}
            placeholder={
              needsDndNote
                ? "Explain why this lead should not be contacted…"
                : "Explain why this lead was lost…"
            }
            className={inputClass}
            disabled={disabled || isPending}
          />
          <p className="text-muted text-xs">
            {needsDndNote
              ? "Required when marking a lead as Do Not Disturb. This note is saved on the lead."
              : "Required when marking a lead as Lost. This note is saved on the lead."}
          </p>
        </div>
      ) : null}

      {needsFollowUpSchedule ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface-sunken/40 p-3">
          <p className="text-sm font-medium">
            Follow-up details <span className="text-danger">*</span>
          </p>
          <p className="text-muted text-xs">
            Scheduling a follow-up is required when moving a lead to Follow Up.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="followUpTriggerType" className="mx-label">
                Type
              </label>
              <select
                id="followUpTriggerType"
                name="followUpTriggerType"
                required
                defaultValue="FOLLOW_UP"
                className={inputClass}
                disabled={disabled || isPending}
              >
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="CALL_LATER">Call Later</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="followUpScheduledFor" className="mx-label">
                Scheduled for
              </label>
              <input
                id="followUpScheduledFor"
                name="followUpScheduledFor"
                type="datetime-local"
                required
                className={inputClass}
                disabled={disabled || isPending}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="followUpNotes" className="mx-label">
              Follow-up notes
            </label>
            <textarea
              id="followUpNotes"
              name="followUpNotes"
              maxLength={4000}
              rows={2}
              placeholder="What should be covered on this follow-up…"
              className={inputClass}
              disabled={disabled || isPending}
            />
          </div>
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

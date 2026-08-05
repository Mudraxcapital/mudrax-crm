"use client";

import { useMemo, useState } from "react";
import {
  bulkAssignLeadsAction,
  bulkChangeLeadStageAction,
  bulkCloseLeadsAction,
  bulkHardDeleteLeadsAction,
} from "../controllers/productivity.actions";
import { isWonOrLostStageName } from "../lib/filterClosedLeadStages";
import { isDoNotDisturbStageName } from "../../application/lib/doNotDisturbPolicy";

/** Matches bulkLeadIdsSchema.max(200). */
export const BULK_LEAD_MAX = 200;

export function BulkLeadActions({
  selectedLeadIds,
  stages,
  lostReasons,
  assignees,
  canHardDelete = false,
}: {
  /** IDs selected in the Leads table (or other UI). */
  selectedLeadIds: string[];
  stages: Array<{ id: string; name: string; bucket?: string; closeOutcome?: string | null }>;
  lostReasons: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; fullName: string }>;
  /** Admin / Manager — permanent DB delete of leads + orphaned customers. */
  canHardDelete?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const [stageId, setStageId] = useState("");
  const [lostReasonId, setLostReasonId] = useState(lostReasons[0]?.id ?? "");
  const [lostNote, setLostNote] = useState("");

  const selected = selectedLeadIds;
  const overLimit = selected.length > BULK_LEAD_MAX;
  const canRun = selected.length > 0 && !overLimit;
  const pickerStages = useMemo(
    () =>
      stages.filter(
        (stage) =>
          stage.bucket !== "CLOSED" || isWonOrLostStageName(stage.name),
      ),
    [stages],
  );
  const selectedStage = pickerStages.find((stage) => stage.id === stageId);
  const stageNeedsLostReason =
    selectedStage?.bucket === "CLOSED" && selectedStage.closeOutcome === "LOST";
  const stageNeedsDndNote = Boolean(
    selectedStage && isDoNotDisturbStageName(selectedStage.name),
  );
  const stageNeedsNote = stageNeedsLostReason || stageNeedsDndNote;
  const lostNoteReady = lostNote.trim().length > 0;

  async function run(
    action: (prev: undefined, formData: FormData) => Promise<{ error?: string; success?: string }>,
    extra: Record<string, string>,
  ) {
    if (!canRun) {
      setMessage(
        overLimit
          ? `Select at most ${BULK_LEAD_MAX} leads per bulk action.`
          : "Select at least one lead in the table.",
      );
      return;
    }
    const formData = new FormData();
    for (const id of selected) formData.append("leadIds", id);
    for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    const result = await action(undefined, formData);
    setMessage(result.error ?? result.success ?? null);
  }

  return (
    <section className="mx-card p-4">
      <h2 className="text-sm font-medium">Bulk operations</h2>
      <p className="text-muted mt-1 text-xs">
        Select leads in the table above, then assign, change status
        {canHardDelete ? ", or permanently delete" : ", or close"}. Max {BULK_LEAD_MAX} leads per
        action.
        {canHardDelete
          ? " Delete removes the lead and its customer from the database."
          : " Close is a soft-close (Closed-Lost)."}
      </p>
      <p className="mt-2 text-sm">
        {selected.length === 0
          ? "No leads selected."
          : overLimit
            ? `${selected.length} selected — deselect down to ${BULK_LEAD_MAX} to continue.`
            : `${selected.length} lead${selected.length === 1 ? "" : "s"} selected.`}
      </p>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-border px-2 py-1 text-sm"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          aria-label="Bulk assignee"
        >
          <option value="" disabled>
            Assignee
          </option>
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-sm"
          disabled={!canRun || !assigneeId}
          onClick={() => {
            void run(bulkAssignLeadsAction, { assignedToUserId: assigneeId });
          }}
        >
          Bulk assign
        </button>

        <select
          className="rounded-lg border border-border px-2 py-1 text-sm"
          value={stageId}
          onChange={(event) => setStageId(event.target.value)}
          aria-label="Bulk stage"
        >
          <option value="" disabled>
            Stage
          </option>
          {pickerStages.map((stage) => (
            <option
              key={stage.id}
              value={stage.id}
              className={isDoNotDisturbStageName(stage.name) ? "font-bold" : undefined}
              style={isDoNotDisturbStageName(stage.name) ? { fontWeight: 700 } : undefined}
            >
              {stage.name}
            </option>
          ))}
        </select>
        {stageNeedsLostReason ? (
          <select
            className="rounded-lg border border-border px-2 py-1 text-sm"
            value={lostReasonId}
            onChange={(event) => setLostReasonId(event.target.value)}
            aria-label="Lost reason for bulk stage"
          >
            <option value="">— Lost reason —</option>
            {lostReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.name}
              </option>
            ))}
          </select>
        ) : null}
        {stageNeedsNote ? (
          <input
            type="text"
            className="rounded-lg border border-border px-2 py-1 text-sm min-w-[12rem]"
            value={lostNote}
            onChange={(event) => setLostNote(event.target.value)}
            placeholder={
              stageNeedsDndNote ? "DND note (required)" : "Lost note (required)"
            }
            aria-label={
              stageNeedsDndNote ? "Do Not Disturb note for bulk stage" : "Lost note for bulk stage"
            }
            maxLength={4000}
          />
        ) : null}
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-sm"
          disabled={
            !canRun ||
            !stageId ||
            (stageNeedsLostReason && (!lostReasonId || !lostNoteReady)) ||
            (stageNeedsDndNote && !lostNoteReady)
          }
          onClick={() => {
            const extra: Record<string, string> = { stageId };
            if (stageNeedsLostReason && lostReasonId) {
              extra.lostReasonId = lostReasonId;
              extra.note = lostNote.trim();
            } else if (stageNeedsDndNote) {
              extra.note = lostNote.trim();
            }
            void run(bulkChangeLeadStageAction, extra);
          }}
        >
          Bulk status
        </button>

        {canHardDelete ? (
          <button
            type="button"
            className="rounded-lg border border-red-600 px-3 py-1 text-sm text-red-700"
            disabled={!canRun}
            onClick={() => {
              if (
                !window.confirm(
                  `Permanently delete ${selected.length} lead(s) and their customers from the database? This cannot be undone.`,
                )
              ) {
                return;
              }
              void run(bulkHardDeleteLeadsAction, {});
            }}
          >
            Delete permanently
          </button>
        ) : (
          <>
            <select
              className="rounded-lg border border-border px-2 py-1 text-sm"
              value={lostReasonId}
              onChange={(event) => setLostReasonId(event.target.value)}
              aria-label="Lost reason for bulk close"
            >
              <option value="">— Lost reason —</option>
              {lostReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="rounded-lg border border-border px-2 py-1 text-sm min-w-[12rem]"
              value={lostNote}
              onChange={(event) => setLostNote(event.target.value)}
              placeholder="Lost note (required)"
              aria-label="Lost note for bulk close"
              maxLength={4000}
            />
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1 text-sm"
              disabled={!canRun || !lostReasonId || !lostNoteReady}
              onClick={() => {
                void run(bulkCloseLeadsAction, {
                  lostReasonId,
                  note: lostNote.trim(),
                });
              }}
            >
              Bulk close
            </button>
          </>
        )}
      </div>
    </section>
  );
}

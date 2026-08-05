"use client";

// ============================================================================
// Admin/Manager UI: temporarily cover a caller's campaign leads for N days.
// Temp caller may be any active agent in the organization.
// ============================================================================

import { useActionState } from "react";
import type { CampaignFormState } from "../controllers/createCampaign.action";

const initialState: CampaignFormState = {};

type FormAction = (
  state: CampaignFormState | undefined,
  formData: FormData,
) => Promise<CampaignFormState>;

export function TemporaryCampaignReassignForm({
  setAction,
  endAction,
  fromCallers,
  orgAgents,
}: {
  setAction: FormAction;
  endAction: FormAction;
  /** Callers who currently own leads in this campaign (on leave). */
  fromCallers: { userId: string; fullName: string }[];
  /** Any assignable agent in the organization (temporary cover). */
  orgAgents: { userId: string; fullName: string }[];
}) {
  const [setState, setFormAction, setPending] = useActionState(setAction, initialState);
  const [endState, endFormAction, endPending] = useActionState(endAction, initialState);

  if (fromCallers.length === 0) {
    return (
      <p className="text-muted text-sm">
        No callers currently have open leads in this campaign to cover.
      </p>
    );
  }

  if (orgAgents.length === 0) {
    return (
      <p className="text-muted text-sm">No agents are available to set as a temporary caller.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={setFormAction} className="flex flex-col gap-3">
        <p className="text-muted text-xs">
          Pick the caller on leave, then any agent in the organization as temporary cover and how
          many days. After those days leads return to the original caller automatically. The cover
          name shows as <span className="font-medium text-foreground">temp</span>.
        </p>
        <label className="text-sm">
          Caller on leave
          <select name="fromUserId" required className="mx-input mt-1 w-full" defaultValue="">
            <option value="" disabled>
              Select caller…
            </option>
            {fromCallers.map((caller) => (
              <option key={caller.userId} value={caller.userId}>
                {caller.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Temporary caller (any agent)
          <select name="toUserId" required className="mx-input mt-1 w-full" defaultValue="">
            <option value="" disabled>
              Select temp caller…
            </option>
            {orgAgents.map((agent) => (
              <option key={agent.userId} value={agent.userId}>
                {agent.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Duration (days) — auto-reverts after this
          <input
            type="number"
            name="durationDays"
            min={1}
            max={90}
            defaultValue={7}
            required
            className="mx-input mt-1 w-full"
          />
        </label>
        {setState.error ? <p className="text-danger text-sm">{setState.error}</p> : null}
        {setState.success ? <p className="text-success text-sm">{setState.success}</p> : null}
        <button type="submit" className="mx-btn mx-btn-primary w-fit" disabled={setPending}>
          {setPending ? "Assigning…" : "Set temporary caller"}
        </button>
      </form>

      <form action={endFormAction} className="flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-muted text-xs">
          End temporary cover early and return leads to the original caller now.
        </p>
        <label className="text-sm">
          Original caller (on leave)
          <select name="fromUserId" required className="mx-input mt-1 w-full" defaultValue="">
            <option value="" disabled>
              Select original caller…
            </option>
            {fromCallers.map((caller) => (
              <option key={caller.userId} value={caller.userId}>
                {caller.fullName}
              </option>
            ))}
          </select>
        </label>
        {endState.error ? <p className="text-danger text-sm">{endState.error}</p> : null}
        {endState.success ? <p className="text-success text-sm">{endState.success}</p> : null}
        <button type="submit" className="mx-btn mx-btn-secondary w-fit" disabled={endPending}>
          {endPending ? "Ending…" : "End temporary assignment"}
        </button>
      </form>
    </div>
  );
}

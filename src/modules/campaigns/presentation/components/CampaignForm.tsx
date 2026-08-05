"use client";

// ============================================================================
// src/modules/campaigns/presentation/components/CampaignForm.tsx
//
// Create form for the Campaign aggregate — optionally select agents and a
// preferred distribution strategy for later auto-assignment.
// ============================================================================

import { useActionState } from "react";
import type { CampaignFormState } from "../controllers/createCampaign.action";

const initialState: CampaignFormState = {};

type CampaignFormAction = (
  state: CampaignFormState | undefined,
  formData: FormData,
) => Promise<CampaignFormState>;

export function CampaignForm({
  action,
  agents = [],
  /** When set (Admin), require selecting which Manager owns the campaign book. */
  ownerManagers = [],
  requireOwnerManager = false,
}: {
  action: CampaignFormAction;
  agents?: Array<{ id: string; fullName: string }>;
  ownerManagers?: Array<{ id: string; fullName: string }>;
  requireOwnerManager?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {requireOwnerManager ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ownerManagerId" className="mx-label">
            Owner Manager
          </label>
          <select
            id="ownerManagerId"
            name="ownerManagerId"
            required
            defaultValue=""
            className="mx-input"
          >
            <option value="" disabled>
              Select Manager…
            </option>
            {ownerManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName}
              </option>
            ))}
          </select>
          <p className="text-muted text-xs">
            Campaigns belong to a Manager book. Pick the Manager who will own this campaign.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="mx-label">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={200}
          className="mx-input"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="source" className="mx-label">
            Source
          </label>
          <input id="source" name="source" type="text" maxLength={100} className="mx-input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="priority" className="mx-label">
            Priority
          </label>
          <select id="priority" name="priority" defaultValue="MEDIUM" className="mx-input">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="mx-label">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={4000}
          className="mx-input"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="mx-label">
            Start date (optional)
          </label>
          <input id="startDate" name="startDate" type="date" className="mx-input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="mx-label">
            End date (optional)
          </label>
          <input id="endDate" name="endDate" type="date" className="mx-input" />
        </div>
      </div>

      {agents.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="mx-label">Agents</span>
          <p className="text-muted text-xs">
            Select Admins, Managers, Team Leads, or Callers to enroll for auto-distribution and taking
            calls.
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-3">
            {agents.map((agent) => (
              <label key={agent.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" name="memberUserIds" value={agent.id} />
                {agent.fullName}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="distributionStrategy" className="mx-label">
          Distribution strategy
        </label>
        <select
          id="distributionStrategy"
          name="distributionStrategy"
          defaultValue="ROUND_ROBIN"
          className="mx-input"
        >
          <option value="ROUND_ROBIN">Round Robin</option>
          <option value="EQUAL">Equal Distribution</option>
          <option value="RANDOM">Random Distribution</option>
          <option value="MANUAL">Manual Assignment</option>
        </select>
        <p className="text-muted text-xs">
          Preferred strategy when you run assignment on the campaign detail page.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="mx-btn mx-btn-primary self-start">
        {isPending ? "Creating…" : "Create Campaign"}
      </button>
    </form>
  );
}

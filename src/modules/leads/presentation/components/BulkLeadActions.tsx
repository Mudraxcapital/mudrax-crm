"use client";

import { useState } from "react";
import {
  bulkAssignLeadsAction,
  bulkChangeLeadStageAction,
  bulkCloseLeadsAction,
} from "../controllers/productivity.actions";

export function BulkLeadActions({
  leadIds,
  stages,
  lostReasons,
  assignees,
}: {
  leadIds: string[];
  stages: Array<{ id: string; name: string }>;
  lostReasons: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; fullName: string }>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function run(
    action: (prev: undefined, formData: FormData) => Promise<{ error?: string; success?: string }>,
    extra: Record<string, string>,
  ) {
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
        Select Leads below, then assign, change status, or close (soft-delete).
      </p>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}

      <ul className="mt-3 max-h-40 overflow-y-auto text-sm">
        {leadIds.map((id) => (
          <li key={id} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={() => toggle(id)}
              id={`bulk-${id}`}
            />
            <label htmlFor={`bulk-${id}`} className="font-mono text-xs">
              {id.slice(0, 8)}…
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          id="bulk-assignee"
          className="rounded-lg border border-border px-2 py-1 text-sm"
          defaultValue=""
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
          disabled={selected.length === 0}
          onClick={() => {
            const el = document.getElementById("bulk-assignee") as HTMLSelectElement | null;
            if (!el?.value) return;
            void run(bulkAssignLeadsAction, { assignedToUserId: el.value });
          }}
        >
          Bulk assign
        </button>

        <select
          id="bulk-stage"
          className="rounded-lg border border-border px-2 py-1 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Stage
          </option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-sm"
          disabled={selected.length === 0}
          onClick={() => {
            const el = document.getElementById("bulk-stage") as HTMLSelectElement | null;
            if (!el?.value) return;
            void run(bulkChangeLeadStageAction, { stageId: el.value });
          }}
        >
          Bulk status
        </button>

        <select
          id="bulk-lost"
          className="rounded-lg border border-border px-2 py-1 text-sm"
          defaultValue={lostReasons[0]?.id ?? ""}
        >
          {lostReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-sm"
          disabled={selected.length === 0}
          onClick={() => {
            const el = document.getElementById("bulk-lost") as HTMLSelectElement | null;
            if (!el?.value) return;
            void run(bulkCloseLeadsAction, { lostReasonId: el.value });
          }}
        >
          Bulk close
        </button>
      </div>
    </section>
  );
}

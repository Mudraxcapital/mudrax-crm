"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadKanbanBoard.tsx
//
// Drag-and-drop Lead Pipeline board (HTML5 DnD — no extra dependency).
// ============================================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { KanbanColumn } from "@/modules/leads";
import { changeLeadStageKanbanAction } from "../controllers/productivity.actions";
import { cn } from "@/shared/ui/cn";

export function LeadKanbanBoard({
  columns,
  lostReasons,
}: {
  columns: KanbanColumn[];
  lostReasons: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [pendingLostDrop, setPendingLostDrop] = useState<{
    leadId: string;
    stageId: string;
  } | null>(null);
  const [lostReasonId, setLostReasonId] = useState("");

  function commitStageChange(leadId: string, stageId: string, reasonId?: string) {
    startTransition(async () => {
      const result = await changeLeadStageKanbanAction({
        leadId,
        stageId,
        lostReasonId: reasonId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
      setDraggingLeadId(null);
      setOverStageId(null);
      setPendingLostDrop(null);
      setLostReasonId("");
    });
  }

  function onDrop(stageId: string, closeOutcome: string | null) {
    if (!draggingLeadId) return;
    if (closeOutcome === "LOST") {
      if (lostReasons.length === 0) {
        setError("Configure a Lost Reason before moving Leads to Closed-Lost.");
        setDraggingLeadId(null);
        setOverStageId(null);
        return;
      }
      // Require explicit Lost Reason — never silently default.
      setPendingLostDrop({ leadId: draggingLeadId, stageId });
      setLostReasonId("");
      setError(null);
      return;
    }
    commitStageChange(draggingLeadId, stageId);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="mx-error rounded-md border border-danger/20 bg-danger-muted px-3 py-2">
          {error}
        </p>
      ) : null}
      {pending ? <p className="text-muted text-xs">Updating stage…</p> : null}

      {pendingLostDrop ? (
        <div
          role="dialog"
          aria-labelledby="kanban-lost-reason-title"
          className="mx-card border-accent/30 flex flex-col gap-3 border p-4"
        >
          <h3 id="kanban-lost-reason-title" className="text-sm font-medium">
            Select a Lost Reason
          </h3>
          <p className="text-muted text-xs">
            Closed-Lost requires a Lost Reason — same as the Lead detail workflow.
          </p>
          <select
            className="mx-input"
            value={lostReasonId}
            onChange={(event) => setLostReasonId(event.target.value)}
            aria-label="Lost reason"
          >
            <option value="">— Select a reason —</option>
            {lostReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
              disabled={!lostReasonId || pending}
              onClick={() => {
                if (!lostReasonId || !pendingLostDrop) return;
                commitStageChange(
                  pendingLostDrop.leadId,
                  pendingLostDrop.stageId,
                  lostReasonId,
                );
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-sm"
              disabled={pending}
              onClick={() => {
                setPendingLostDrop(null);
                setLostReasonId("");
                setDraggingLeadId(null);
                setOverStageId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-scroll flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <section
            key={column.stageId}
            className={cn(
              "bg-surface-sunken/50 min-w-[240px] flex-1 rounded-xl border border-border transition-colors",
              overStageId === column.stageId && "border-accent bg-accent-muted/30",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setOverStageId(column.stageId);
            }}
            onDragLeave={() => setOverStageId((id) => (id === column.stageId ? null : id))}
            onDrop={() => onDrop(column.stageId, column.closeOutcome)}
          >
            <header className="sticky top-0 z-[1] border-b border-border bg-surface/95 px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-tight">{column.stageName}</h2>
                <span className="bg-surface text-muted rounded-md border border-border px-1.5 py-0.5 text-[11px] tabular-nums">
                  {column.totalCount}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">{column.bucket}</p>
              {column.totalCount > column.leads.length ? (
                <p className="text-muted mt-1 text-[11px]">
                  Showing {column.leads.length.toLocaleString()} of{" "}
                  {column.totalCount.toLocaleString()}
                </p>
              ) : null}
            </header>
            <ul className="flex min-h-[140px] flex-col gap-2 p-2">
              {column.leads.map((lead) => (
                <li
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggingLeadId(lead.id)}
                  onDragEnd={() => {
                    setDraggingLeadId(null);
                    setOverStageId(null);
                  }}
                  className={cn(
                    "cursor-grab rounded-lg border border-border bg-surface px-3 py-2.5 text-sm shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing",
                    draggingLeadId === lead.id && "opacity-60 ring-2 ring-accent/40",
                  )}
                >
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium tracking-tight hover:text-accent"
                    onClick={(event) => event.stopPropagation()}
                    draggable={false}
                  >
                    {lead.fullNameSnapshot}
                  </Link>
                  {lead.leadSourceName ? (
                    <p className="text-muted mt-1 text-xs">{lead.leadSourceName}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

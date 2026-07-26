"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadKanbanBoard.tsx
//
// Drag-and-drop Lead Pipeline board (HTML5 DnD — no extra dependency).
// ============================================================================

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

  function onDrop(stageId: string, closeOutcome: string | null) {
    if (!draggingLeadId) return;
    let lostReasonId: string | undefined;
    if (closeOutcome === "LOST") {
      lostReasonId = lostReasons[0]?.id;
      if (!lostReasonId) {
        setError("Configure a Lost Reason before moving Leads to Closed-Lost.");
        return;
      }
    }
    startTransition(async () => {
      const result = await changeLeadStageKanbanAction({
        leadId: draggingLeadId,
        stageId,
        lostReasonId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
      setDraggingLeadId(null);
      setOverStageId(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="mx-error rounded-md border border-danger/20 bg-danger-muted px-3 py-2">
          {error}
        </p>
      ) : null}
      {pending ? <p className="text-muted text-xs">Updating stage…</p> : null}
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
                  <a
                    href={`/leads/${lead.id}`}
                    className="font-medium tracking-tight hover:text-accent"
                  >
                    {lead.fullNameSnapshot}
                  </a>
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

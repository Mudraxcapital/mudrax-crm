"use client";

// ============================================================================
// src/modules/leads/presentation/components/LeadKanbanBoard.tsx
//
// Drag-and-drop Lead Pipeline board (HTML5 DnD — no extra dependency).
// ============================================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { KanbanColumn } from "@/modules/leads";
import { isDoNotDisturbStageName } from "../../application/lib/doNotDisturbPolicy";
import { changeLeadStageKanbanAction } from "../controllers/productivity.actions";
import { cn } from "@/shared/ui/cn";

const BOARD_SCROLL_STEP = 280;

export function LeadKanbanBoard({
  columns,
  lostReasons,
}: {
  columns: KanbanColumn[];
  lostReasons: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const stageNavRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(
    columns[0]?.stageId ?? null,
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [pendingNoteDrop, setPendingNoteDrop] = useState<{
    leadId: string;
    stageId: string;
    kind: "lost" | "dnd";
  } | null>(null);
  const [lostReasonId, setLostReasonId] = useState("");
  const [lostNote, setLostNote] = useState("");

  function updateBoardScrollState() {
    const board = boardRef.current;
    if (!board) return;
    const maxScroll = board.scrollWidth - board.clientWidth;
    setCanScrollLeft(board.scrollLeft > 4);
    setCanScrollRight(maxScroll - board.scrollLeft > 4);
  }

  useEffect(() => {
    if (!columns.some((column) => column.stageId === activeStageId)) {
      setActiveStageId(columns[0]?.stageId ?? null);
    }
  }, [columns, activeStageId]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    updateBoardScrollState();
    board.addEventListener("scroll", updateBoardScrollState, { passive: true });
    const observer = new ResizeObserver(updateBoardScrollState);
    observer.observe(board);
    return () => {
      board.removeEventListener("scroll", updateBoardScrollState);
      observer.disconnect();
    };
  }, [columns.length]);

  function scrollBoardBy(delta: number) {
    boardRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  function scrollToStage(stageId: string) {
    const board = boardRef.current;
    if (!board) return;
    const column = board.querySelector<HTMLElement>(
      `[data-stage-id="${CSS.escape(stageId)}"]`,
    );
    if (!column) return;
    const boardRect = board.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const nextLeft = board.scrollLeft + (columnRect.left - boardRect.left) - 12;
    board.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
    setActiveStageId(stageId);

    const nav = stageNavRef.current;
    const chip = nav?.querySelector<HTMLElement>(
      `[data-stage-nav-id="${CSS.escape(stageId)}"]`,
    );
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function commitStageChange(
    leadId: string,
    stageId: string,
    reasonId?: string,
    note?: string,
  ) {
    startTransition(async () => {
      const result = await changeLeadStageKanbanAction({
        leadId,
        stageId,
        lostReasonId: reasonId,
        note,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
      setDraggingLeadId(null);
      setOverStageId(null);
      setPendingNoteDrop(null);
      setLostReasonId("");
      setLostNote("");
    });
  }

  function onDrop(stageId: string, closeOutcome: string | null, stageName: string) {
    if (!draggingLeadId) return;
    if (closeOutcome === "LOST") {
      if (lostReasons.length === 0) {
        setError("Configure a Lost Reason before moving Leads to Closed-Lost.");
        setDraggingLeadId(null);
        setOverStageId(null);
        return;
      }
      // Require explicit Lost Reason + note — never silently default.
      setPendingNoteDrop({ leadId: draggingLeadId, stageId, kind: "lost" });
      setLostReasonId("");
      setLostNote("");
      setError(null);
      return;
    }
    if (isDoNotDisturbStageName(stageName)) {
      setPendingNoteDrop({ leadId: draggingLeadId, stageId, kind: "dnd" });
      setLostReasonId("");
      setLostNote("");
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

      {pendingNoteDrop ? (
        <div
          role="dialog"
          aria-labelledby="kanban-note-drop-title"
          className="mx-card border-accent/30 flex flex-col gap-3 border p-4"
        >
          <h3 id="kanban-note-drop-title" className="text-sm font-medium">
            {pendingNoteDrop.kind === "dnd" ? (
              <span className="font-bold">Mark as Do Not Disturb</span>
            ) : (
              "Mark as Lost"
            )}
          </h3>
          <p className="text-muted text-xs">
            {pendingNoteDrop.kind === "dnd"
              ? "Do Not Disturb requires a note. The lead moves into the Do Not Disturb campaign."
              : "Closed-Lost requires a Lost Reason and a note — same as the campaign dashboard."}
          </p>
          {pendingNoteDrop.kind === "lost" ? (
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
          ) : null}
          <textarea
            className="mx-input"
            value={lostNote}
            onChange={(event) => setLostNote(event.target.value)}
            rows={3}
            maxLength={4000}
            required
            placeholder={
              pendingNoteDrop.kind === "dnd"
                ? "Explain why this lead should not be contacted…"
                : "Explain why this lead was lost…"
            }
            aria-label={pendingNoteDrop.kind === "dnd" ? "Do Not Disturb note" : "Lost note"}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
              disabled={
                (pendingNoteDrop.kind === "lost" && !lostReasonId) ||
                !lostNote.trim() ||
                pending
              }
              onClick={() => {
                if (!lostNote.trim() || !pendingNoteDrop) return;
                if (pendingNoteDrop.kind === "lost" && !lostReasonId) return;
                commitStageChange(
                  pendingNoteDrop.leadId,
                  pendingNoteDrop.stageId,
                  pendingNoteDrop.kind === "lost" ? lostReasonId : undefined,
                  lostNote.trim(),
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
                setPendingNoteDrop(null);
                setLostReasonId("");
                setLostNote("");
                setDraggingLeadId(null);
                setOverStageId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {columns.length > 0 ? (
        <div className="mx-card flex items-center gap-2 p-2">
          <button
            type="button"
            className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-sm disabled:opacity-40"
            aria-label="Scroll pipeline left"
            disabled={!canScrollLeft}
            onClick={() => scrollBoardBy(-BOARD_SCROLL_STEP)}
          >
            ←
          </button>
          <div
            ref={stageNavRef}
            className="mx-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
            role="navigation"
            aria-label="Pipeline stages"
          >
            {columns.map((column) => {
              const active = activeStageId === column.stageId;
              return (
                <button
                  key={column.stageId}
                  type="button"
                  data-stage-nav-id={column.stageId}
                  onClick={() => scrollToStage(column.stageId)}
                  className={cn(
                    "shrink-0 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                    active
                      ? "border-accent bg-accent-muted text-foreground"
                      : "border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      isDoNotDisturbStageName(column.stageName) && "font-bold",
                    )}
                  >
                    {column.stageName}
                  </span>
                  <span className="ml-1.5 tabular-nums opacity-70">{column.totalCount}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-sm disabled:opacity-40"
            aria-label="Scroll pipeline right"
            disabled={!canScrollRight}
            onClick={() => scrollBoardBy(BOARD_SCROLL_STEP)}
          >
            →
          </button>
        </div>
      ) : null}

      <div ref={boardRef} className="mx-scroll flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <section
            key={column.stageId}
            data-stage-id={column.stageId}
            className={cn(
              "bg-surface-sunken/50 min-w-[240px] flex-1 rounded-xl border border-border transition-colors",
              overStageId === column.stageId && "border-accent bg-accent-muted/30",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setOverStageId(column.stageId);
            }}
            onDragLeave={() => setOverStageId((id) => (id === column.stageId ? null : id))}
            onDrop={() => onDrop(column.stageId, column.closeOutcome, column.stageName)}
          >
            <header className="sticky top-0 z-[1] border-b border-border bg-surface/95 px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                <h2
                  className={cn(
                    "text-sm font-semibold tracking-tight",
                    isDoNotDisturbStageName(column.stageName) && "font-bold",
                  )}
                >
                  {column.stageName}
                </h2>
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

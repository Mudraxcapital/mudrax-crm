"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";

interface DueFollowUpItem {
  id: string;
  leadId: string;
  triggerType: string;
  status: string;
  scheduledFor: string;
  currentAssigneeUserId: string;
}

const DISMISS_KEY = "mudrax-followup-due-dismissed";
const POLL_MS = 45_000;

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function FollowUpDuePopup({
  userId,
  isCallerWorkspace = false,
}: {
  userId: string;
  isCallerWorkspace?: boolean;
}) {
  const [item, setItem] = useState<DueFollowUpItem | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/follow-ups?limit=50", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const json = (await response.json()) as { data?: DueFollowUpItem[] };
      const now = Date.now();
      const due = (json.data ?? []).filter(
        (row) =>
          row.currentAssigneeUserId === userId &&
          ["DUE", "MISSED", "ESCALATED"].includes(row.status) &&
          new Date(row.scheduledFor).getTime() <= now &&
          !dismissed.has(row.id),
      );
      due.sort(
        (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
      );
      setItem(due[0] ?? null);
    } catch {
      // ignore
    }
  }, [dismissed, userId]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [poll]);

  function dismiss() {
    if (!item) return;
    const next = new Set(dismissed);
    next.add(item.id);
    setDismissed(next);
    saveDismissed(next);
    setItem(null);
  }

  const leadHref = item
    ? isCallerWorkspace
      ? `/caller/leads/${item.leadId}`
      : `/leads/${item.leadId}`
    : "/follow-ups";

  return (
    <Dialog
      open={Boolean(item)}
      onClose={dismiss}
      title="Follow-up required"
      description="A customer follow-up is due. Please complete it now."
      size="sm"
      footer={
        <div className="flex flex-wrap gap-2">
          <Link href={leadHref} onClick={dismiss}>
            <Button size="sm" variant="primary">
              Open lead
            </Button>
          </Link>
          <Link href="/follow-ups" onClick={dismiss}>
            <Button size="sm" variant="secondary">
              Follow-ups
            </Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Later
          </Button>
        </div>
      }
    >
      {item ? (
        <p className="text-sm">
          {item.triggerType === "CALL_LATER" ? "Call Later" : "Follow-up"} scheduled for{" "}
          <span className="font-medium">
            {new Date(item.scheduledFor).toLocaleString()}
          </span>
        </p>
      ) : null}
    </Dialog>
  );
}

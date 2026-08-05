"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import {
  inAppNotificationBody,
  inAppNotificationTitle,
  isFollowUpNotification,
} from "../lib/inAppNotificationCopy";

interface NotificationItem {
  id: string;
  templateCode: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

const DISMISS_KEY = "mudrax-inapp-notif-dismissed";
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

/**
 * Corner alert for newly delivered personal notifications.
 * Non-blocking — does not cover the whole CRM like a debug modal.
 */
export function InAppNotificationPopup({ inboxHref }: { inboxHref: string }) {
  const [item, setItem] = useState<NotificationItem | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?mine=1&limit=20", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const json = (await response.json()) as { data?: NotificationItem[] };
      const newest = [...(json.data ?? [])]
        .filter((row) => !dismissed.has(row.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      setItem(newest ?? null);
    } catch {
      // ignore
    }
  }, [dismissed]);

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

  if (!item) return null;

  const followUp = isFollowUpNotification(item.templateCode);

  return (
    <aside
      className="fixed right-4 bottom-4 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
      role="status"
      aria-live="polite"
      aria-labelledby="inapp-notification-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted text-[11px] font-medium tracking-wide uppercase">
            Notification
          </p>
          <p id="inapp-notification-title" className="mt-1 text-sm font-semibold">
            {inAppNotificationTitle(item.templateCode)}
          </p>
          <p className="text-muted mt-1.5 text-xs leading-relaxed">
            {inAppNotificationBody(item.templateCode, item.payload)}
          </p>
        </div>
        <button
          type="button"
          className="text-muted hover:text-foreground -mt-0.5 -mr-0.5 rounded-md px-1.5 py-0.5 text-lg leading-none"
          aria-label="Dismiss notification"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={inboxHref} onClick={dismiss}>
          <Button size="sm" variant="primary">
            View
          </Button>
        </Link>
        {followUp ? (
          <Link href="/follow-ups" onClick={dismiss}>
            <Button size="sm" variant="secondary">
              Follow-ups
            </Button>
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

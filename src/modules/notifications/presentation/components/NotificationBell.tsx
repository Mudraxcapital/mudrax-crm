"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { inAppNotificationTitle } from "../lib/inAppNotificationCopy";

interface NotificationItem {
  id: string;
  templateCode: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

const POLL_MS = 60_000;
const SEEN_KEY = "mudrax-notification-seen-at";

function loadSeenAt(): number {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveSeenAt(timestamp: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(timestamp));
  } catch {
    // ignore
  }
}

export function NotificationBell({ inboxHref }: { inboxHref: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [seenAt, setSeenAt] = useState(0);

  useEffect(() => {
    setSeenAt(loadSeenAt());
  }, []);

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?mine=1&limit=40", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const json = (await response.json()) as { data?: NotificationItem[] };
      setItems(json.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [poll]);

  const unread = items.filter((item) => new Date(item.createdAt).getTime() > seenAt).length;

  function markSeen() {
    const next = Date.now();
    setSeenAt(next);
    saveSeenAt(next);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) markSeen();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="text-muted hover:text-foreground hover:bg-surface-sunken relative inline-flex size-9 items-center justify-center rounded-md border border-border"
        aria-label={unread > 0 ? `Notifications (${unread} new)` : "Notifications"}
        onClick={toggle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 1.75a3.25 3.25 0 00-3.25 3.25v1.2c0 .7-.22 1.38-.63 1.95L3.3 9.3A.75.75 0 003.9 10.5h8.2a.75.75 0 00.6-1.2l-.82-1.15a3.4 3.4 0 01-.63-1.95V5A3.25 3.25 0 008 1.75z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 12.25a1.5 1.5 0 003 0"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 ? (
          <span className="bg-danger text-white absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[20rem] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.12)] sm:w-[22rem]">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-medium">Notifications</p>
              <Link
                href={inboxHref}
                className="text-accent text-xs hover:underline"
                onClick={() => setOpen(false)}
              >
                Open channel
              </Link>
            </div>
            <ul className="mx-scroll max-h-80 divide-y divide-border overflow-y-auto">
              {items.length === 0 ? (
                <li className="text-muted px-3 py-6 text-center text-xs">
                  No notifications yet.
                </li>
              ) : (
                items.slice(0, 12).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={inboxHref}
                      className="hover:bg-surface-sunken block px-3 py-2.5"
                      onClick={() => setOpen(false)}
                    >
                      <p className="text-xs font-medium">
                        {inAppNotificationTitle(item.templateCode)}
                      </p>
                      <p className="text-muted mt-0.5 text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}

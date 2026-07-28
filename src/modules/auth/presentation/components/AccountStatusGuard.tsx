"use client";

// ============================================================================
// Polls session validity so Disable / Suspend force-logs the user out without
// waiting for a full navigation. Mounted in the authenticated AppShell.
// Uses an in-app Dialog — never native window.alert / browser popups.
// Completes logout via full navigation to /clear-session (POST Server Action
// there), avoiding Server Action flight errors inside this dialog.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { isSessionClearReason, type SessionClearReason } from "../../domain/sessionClearReason";

const POLL_MS = 8_000;

type SessionEndReason = SessionClearReason | "unauthenticated";

function messageForReason(reason: SessionEndReason): { title: string; description: string } {
  switch (reason) {
    case "disabled":
      return {
        title: "Account disabled",
        description:
          "Your account has been disabled. Please contact your administrator for help.",
      };
    case "suspended":
      return {
        title: "Account suspended",
        description:
          "Your account has been suspended. Please contact your administrator for help.",
      };
    default:
      return {
        title: "Session ended",
        description: "Your session expired. Please sign in again to continue.",
      };
  }
}

export function AccountStatusGuard({ enabled }: { enabled: boolean }) {
  const forcingOut = useRef(false);
  const [reason, setReason] = useState<SessionEndReason | null>(null);

  const leave = useCallback((next: SessionEndReason) => {
    if (forcingOut.current) return;
    forcingOut.current = true;
    setReason(next);
  }, []);

  const confirmLeave = useCallback(() => {
    if (!reason) return;
    if (reason === "unauthenticated") {
      window.location.assign("/login");
      return;
    }
    const params = new URLSearchParams({ reason });
    window.location.assign(`/clear-session?${params.toString()}`);
  }, [reason]);

  useEffect(() => {
    if (!enabled || reason) return;

    async function check() {
      if (forcingOut.current) return;
      try {
        const response = await fetch("/api/auth/session-status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.ok) return;

        // Only force logout on explicit auth denials — not transient 5xx/HTML errors.
        if (response.status !== 401 && response.status !== 403) return;

        const body = (await response.json().catch(() => ({}))) as { reason?: string };
        const next: SessionEndReason = isSessionClearReason(body.reason)
          ? body.reason
          : body.reason === "unauthenticated"
            ? "unauthenticated"
            : "session_revoked";
        leave(next);
      } catch {
        // Network blip — try again on the next interval.
      }
    }

    void check();
    const timer = window.setInterval(() => {
      void check();
    }, POLL_MS);

    const onFocus = () => {
      void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, leave, reason]);

  if (!reason) return null;

  const copy = messageForReason(reason);

  return (
    <Dialog
      open
      onClose={confirmLeave}
      title={copy.title}
      description={copy.description}
      size="sm"
    >
      <div className="flex justify-end">
        <Button type="button" onClick={confirmLeave}>
          Continue to sign in
        </Button>
      </div>
    </Dialog>
  );
}

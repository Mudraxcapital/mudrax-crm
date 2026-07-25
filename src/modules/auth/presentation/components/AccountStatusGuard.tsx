"use client";

// ============================================================================
// Polls session validity so Disable / Suspend force-logs the user out without
// waiting for a full navigation. Mounted in the authenticated AppShell.
// ============================================================================

import { useEffect, useRef } from "react";

const POLL_MS = 8_000;
const ACCOUNT_DISABLED_MESSAGE =
  "Your account has been disabled.\nPlease contact your administrator.";

export function AccountStatusGuard({ enabled }: { enabled: boolean }) {
  const forcingOut = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    async function check() {
      if (forcingOut.current) return;
      try {
        const response = await fetch("/api/auth/session-status", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.ok) return;

        const body = (await response.json().catch(() => ({}))) as { reason?: string };
        const reason = body.reason ?? "disabled";
        forcingOut.current = true;
        window.alert(ACCOUNT_DISABLED_MESSAGE);
        window.location.href = `/api/auth/clear-session?reason=${encodeURIComponent(reason)}`;
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
  }, [enabled]);

  return null;
}

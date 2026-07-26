"use client";

// ============================================================================
// Auto-submits a POST Server Action to clear a stale session cookie.
// Used by /clear-session when Server Components redirect here (they cannot
// mutate cookies themselves).
// ============================================================================

import { useEffect, useRef } from "react";
import { clearStaleSessionAction } from "../controllers/clearStaleSession.action";

export function ClearStaleSessionForm({ reason }: { reason?: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={clearStaleSessionAction} className="flex flex-col items-center gap-3">
      {reason ? <input type="hidden" name="reason" value={reason} /> : null}
      <p className="text-muted text-sm">Signing you out…</p>
      <noscript>
        <button type="submit" className="mx-btn mx-btn-primary">
          Continue to sign in
        </button>
      </noscript>
    </form>
  );
}

"use server";

// ============================================================================
// POST-only Server Action that clears a stale Auth.js JWT.
// Same secure pattern as logoutAction — never a bare GET, so cross-site
// <img>/<link> cannot force a logout.
// ============================================================================

import { signOut } from "@/infra/auth";
import {
  isSessionClearReason,
  loginRedirectForClearReason,
} from "../../domain/sessionClearReason";

export async function clearStaleSessionAction(formData: FormData): Promise<void> {
  const reasonRaw = formData.get("reason");
  const reason = isSessionClearReason(reasonRaw) ? reasonRaw : null;
  await signOut({ redirectTo: loginRedirectForClearReason(reason) });
}

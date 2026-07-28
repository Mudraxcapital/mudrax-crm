"use server";

// ============================================================================
// POST-only Server Action that clears a stale Auth.js JWT.
// Same secure pattern as logoutAction — never a bare GET, so cross-site
// <img>/<link> cannot force a logout.
//
// Important: use signOut({ redirect: false }) + next/navigation redirect.
// Auth.js redirectTo responses are not valid Server Action flight payloads and
// surface as "An unexpected response was received from the server."
// ============================================================================

import { redirect } from "next/navigation";
import { signOut } from "@/infra/auth";
import {
  isSessionClearReason,
  loginRedirectForClearReason,
} from "../../domain/sessionClearReason";

export async function clearStaleSessionAction(formData: FormData): Promise<void> {
  const reasonRaw = formData.get("reason");
  const reason = isSessionClearReason(reasonRaw) ? reasonRaw : null;
  const target = loginRedirectForClearReason(reason);

  try {
    await signOut({ redirect: false });
  } catch {
    // Cookie/session may already be gone — still send the user to login.
  }

  redirect(target);
}

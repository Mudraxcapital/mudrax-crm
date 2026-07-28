"use server";

// ============================================================================
// src/modules/auth/presentation/controllers/logout.action.ts
//
// Server Action backing LogoutButton.tsx. A POST-only Server Action (never
// a bare GET route) so logout cannot be triggered by a cross-site link/image
// — Auth.js's CSRF protection defaults apply here too.
// ============================================================================

import { redirect } from "next/navigation";
import { signOut } from "@/infra/auth";

export async function logoutAction(): Promise<void> {
  try {
    await signOut({ redirect: false });
  } catch {
    // Already signed out.
  }
  redirect("/login");
}

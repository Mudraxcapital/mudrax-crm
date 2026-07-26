import { redirect } from "next/navigation";
import { requireCallerWorkspace } from "@/infra/auth/session";

/**
 * Callers use the same Profile experience as other roles (`/profile`).
 * Kept as a stable nav target that redirects into the shared page.
 */
export default async function CallerProfilePage() {
  await requireCallerWorkspace();
  redirect("/profile");
}

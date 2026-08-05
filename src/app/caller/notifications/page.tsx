import { redirect } from "next/navigation";
import { requireCallerWorkspace } from "@/infra/auth/session";

/** Callers share the same personal Notification Channel as other roles. */
export default async function CallerNotificationsPage() {
  await requireCallerWorkspace();
  redirect("/notifications/inbox");
}

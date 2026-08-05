/** Human labels for system IN_APP follow-up templates. */

export function inAppNotificationTitle(templateCode: string | null | undefined): string {
  const code = templateCode ?? "";
  if (code.includes("reminder")) return "Follow-up is due";
  if (code.includes("escalation_team_lead")) return "Follow-up needs Team Lead attention";
  if (code.includes("escalation_manager") || code.includes("escalation_admin")) {
    return "Follow-up needs Manager attention";
  }
  if (code.startsWith("system.")) return "System alert";
  return templateCode?.replace(/^system\./, "").replace(/[._]/g, " ") || "Notification";
}

export function inAppNotificationBody(
  templateCode: string | null | undefined,
  payload: Record<string, unknown>,
): string {
  const code = templateCode ?? "";
  const scheduledFor =
    typeof payload.scheduledFor === "string" ? new Date(payload.scheduledFor) : null;
  const when =
    scheduledFor && !Number.isNaN(scheduledFor.getTime())
      ? scheduledFor.toLocaleString()
      : null;

  if (code.includes("reminder")) {
    return when
      ? `A customer follow-up was scheduled for ${when}. Please complete it.`
      : "A customer follow-up is due. Please complete it.";
  }
  if (code.includes("escalation_team_lead")) {
    return "The Caller did not complete this follow-up by the next day.";
  }
  if (code.includes("escalation_manager") || code.includes("escalation_admin")) {
    return "The Team Lead did not complete this follow-up by the next day.";
  }
  return "You have a new notification.";
}

export function isFollowUpNotification(templateCode: string | null | undefined): boolean {
  return (templateCode ?? "").includes("follow_up");
}

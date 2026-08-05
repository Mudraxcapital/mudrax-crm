import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { listFollowUps } from "@/modules/follow-ups";
import { getLeadsByIds } from "@/modules/leads";
import { listUsers } from "@/modules/users";
import { completeFollowUpAction } from "@/modules/follow-ups/presentation/controllers/completeFollowUp.action";
import { CompleteFollowUpForm } from "@/modules/follow-ups/presentation/components/CompleteFollowUpForm";
import { followUpListFilter } from "@/shared/auth/applyHierarchyListFilter";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Badge } from "@/shared/ui/Badge";

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "DUE":
    case "MISSED":
      return "danger";
    case "ESCALATED":
      return "warning";
    default:
      return "neutral";
  }
}

export default async function FollowUpsPage() {
  const { session, authContext } = await requirePermission("follow_up.view");
  const canComplete = hasPermission(authContext, "follow_up.complete");
  const callerWorkspace = isCallerWorkspaceUser(authContext);
  const leadHref = (leadId: string) =>
    callerWorkspace ? `/caller/leads/${leadId}` : `/leads/${leadId}`;

  const filter = followUpListFilter(authContext, {
    permissionCode: "follow_up.view",
    actorUserId: session.user.id,
  });

  const [followUps, users] = await Promise.all([
    listFollowUps(authContext.organizationId, {
      ...filter,
      limit: 200,
    }),
    listUsers({ status: "ACTIVE", limit: 2_000 }).catch(() => []),
  ]);
  const leadIds = [...new Set(followUps.map((followUp) => followUp.leadId))];
  const leads = leadIds.length > 0 ? await getLeadsByIds(leadIds) : [];
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const userNameById = new Map(users.map((user) => [user.id, user.fullName]));

  const openCount = followUps.filter((item) =>
    ["SCHEDULED", "DUE", "MISSED", "ESCALATED"].includes(item.status),
  ).length;
  const dueCount = followUps.filter((item) => item.status === "DUE" || item.status === "MISSED")
    .length;

  return (
    <PageSection>
      <PageHeader
        title="Follow-ups"
        description="Lead and follow-up details for your portfolio. Due items need action; unanswered ones escalate Caller → Team Lead (next day) → Manager + Admin (day after)."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-muted text-xs">Total</p>
          <p className="text-lg font-semibold">{followUps.length}</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-muted text-xs">Open</p>
          <p className="text-lg font-semibold">{openCount}</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-muted text-xs">Due / Missed</p>
          <p className="text-lg font-semibold">{dueCount}</p>
        </div>
      </div>

      <section className="mx-card overflow-hidden">
        <ul>
          {followUps.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">No Follow-ups yet.</li>
          ) : (
            followUps.map((followUp) => {
              const lead = leadById.get(followUp.leadId);
              const boundComplete = completeFollowUpAction.bind(null, followUp.leadId, followUp.id);
              return (
                <li
                  key={followUp.id}
                  className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={leadHref(followUp.leadId)}
                        className="text-sm font-medium text-accent hover:underline underline-offset-4"
                      >
                        {lead?.fullNameSnapshot ?? "Lead"}
                      </Link>
                      <p className="text-muted text-xs">
                        {lead?.phoneSnapshot ? `${lead.phoneSnapshot} · ` : ""}
                        {lead?.currentStageName ?? "Lead"} ·{" "}
                        {lead?.leadSourceName ?? "Source"}
                      </p>
                      <p className="text-muted text-xs">
                        {followUp.triggerType === "CALL_LATER" ? "Call Later" : "Follow-up"} ·{" "}
                        Scheduled {new Date(followUp.scheduledFor).toLocaleString()} · Assignee{" "}
                        {userNameById.get(followUp.currentAssigneeUserId) ?? "Unknown"}
                        {followUp.escalatedToUserId
                          ? ` · Escalated to ${userNameById.get(followUp.escalatedToUserId) ?? "supervisor"}`
                          : ""}
                      </p>
                    </div>
                    <Badge tone={statusTone(followUp.status)}>{followUp.status}</Badge>
                  </div>

                  {canComplete &&
                  followUp.status !== "COMPLETED" &&
                  followUp.status !== "CANCELLED" ? (
                    <CompleteFollowUpForm action={boundComplete} />
                  ) : followUp.outcomeNotes ? (
                    <p className="text-muted text-xs">{followUp.outcomeNotes}</p>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link
          href={callerWorkspace ? "/caller/leads" : "/leads"}
          className="text-accent hover:underline underline-offset-4"
        >
          Leads →
        </Link>
        {!callerWorkspace ? (
          <Link href="/crm" className="text-accent hover:underline underline-offset-4">
            CRM Dashboard →
          </Link>
        ) : null}
      </nav>
    </PageSection>
  );
}

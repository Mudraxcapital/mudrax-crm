import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { listFollowUps } from "@/modules/follow-ups";
import { listLeads } from "@/modules/leads";
import { completeFollowUpAction } from "@/modules/follow-ups/presentation/controllers/completeFollowUp.action";
import { CompleteFollowUpForm } from "@/modules/follow-ups/presentation/components/CompleteFollowUpForm";

export default async function FollowUpsPage() {
  const { session, authContext } = await requirePermission("follow_up.view");
  const canComplete = hasPermission(authContext, "follow_up.complete");

  const scope = getPermissionScope(authContext, "follow_up.view");
  const filter = scope === "SELF" ? { assignedToUserIds: [session.user.id] } : undefined;

  const [followUps, leads] = await Promise.all([
    listFollowUps(authContext.organizationId, filter),
    listLeads(authContext.organizationId),
  ]);
  const leadNameById = new Map(leads.map((lead) => [lead.id, lead.fullNameSnapshot]));

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Follow-ups</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Scheduled callback/reminder tasks across your portfolio of Leads.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <ul>
          {followUps.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No Follow-ups yet.</li>
          ) : (
            followUps.map((followUp) => {
              const boundComplete = completeFollowUpAction.bind(null, followUp.leadId, followUp.id);
              return (
                <li
                  key={followUp.id}
                  className="flex flex-col gap-3 border-b border-black/5 px-4 py-4 last:border-0 dark:border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/leads/${followUp.leadId}`}
                        className="text-sm font-medium underline underline-offset-4"
                      >
                        {leadNameById.get(followUp.leadId) ?? followUp.leadId}
                      </Link>
                      <p className="text-foreground/60 mt-0.5 text-xs">
                        {followUp.triggerType === "CALL_LATER" ? "Call Later" : "Follow-up"} ·{" "}
                        {new Date(followUp.scheduledFor).toLocaleString()} · {followUp.status}
                      </p>
                    </div>
                  </div>
                  {canComplete &&
                  followUp.status !== "COMPLETED" &&
                  followUp.status !== "CANCELLED" ? (
                    <CompleteFollowUpForm action={boundComplete} />
                  ) : followUp.outcomeNotes ? (
                    <p className="text-foreground/60 text-xs">{followUp.outcomeNotes}</p>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/leads" className="underline underline-offset-4">
          Leads →
        </Link>
        <Link href="/crm" className="underline underline-offset-4">
          CRM Dashboard →
        </Link>
      </nav>
    </div>
  );
}

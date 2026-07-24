import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listRecentCrmActivity } from "../_lib/recentActivity";

export default async function ActivityTimelinePage() {
  const { authContext } = await requireAuth();

  const includeLeads = hasPermission(authContext, "lead.view");
  const includeFollowUps = hasPermission(authContext, "follow_up.view");
  const includeCampaigns = hasPermission(authContext, "campaign.view");

  const activity =
    includeLeads || includeFollowUps || includeCampaigns
      ? await listRecentCrmActivity(authContext.organizationId, 50, {
          includeLeads,
          includeFollowUps,
          includeCampaigns,
        })
      : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/crm" className="text-sm underline underline-offset-4">
        ← CRM Dashboard
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Activity Timeline</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Chronological CRM activity across Leads, Follow-ups, and Campaigns.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <ul className="flex flex-col">
          {activity.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No activity yet.</li>
          ) : (
            activity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <div>
                  <span className="text-foreground/50 mr-2 rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/15">
                    {entry.source}
                  </span>
                  {entry.leadId ? (
                    <Link href={`/leads/${entry.leadId}`} className="underline underline-offset-4">
                      {entry.label}
                    </Link>
                  ) : (
                    <span>{entry.label}</span>
                  )}
                </div>
                <span className="text-foreground/60 whitespace-nowrap">
                  {new Date(entry.occurredAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

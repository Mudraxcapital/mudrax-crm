import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { countCustomers } from "@/modules/customers";
import { countLeads, getLeadsByStage, getLeadsBySource } from "@/modules/leads";
import { CAMPAIGN_STATUSES, listCampaigns } from "@/modules/campaigns";
import { listRecentCrmActivity } from "../_lib/recentActivity";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default async function CrmDashboardPage() {
  const { authContext } = await requireAuth();

  const canViewCustomers = hasPermission(authContext, "customer.view");
  const canViewLeads = hasPermission(authContext, "lead.view");
  const canViewCampaigns = hasPermission(authContext, "campaign.view");
  const canViewFollowUps = hasPermission(authContext, "follow_up.view");

  const [totalCustomers, totalLeads, leadsByStage, leadsBySource, campaigns, activity] =
    await Promise.all([
      canViewCustomers ? countCustomers(authContext.organizationId) : Promise.resolve(0),
      canViewLeads ? countLeads(authContext.organizationId) : Promise.resolve(0),
      canViewLeads ? getLeadsByStage(authContext.organizationId) : Promise.resolve([]),
      canViewLeads ? getLeadsBySource(authContext.organizationId) : Promise.resolve([]),
      canViewCampaigns ? listCampaigns(authContext.organizationId) : Promise.resolve([]),
      listRecentCrmActivity(authContext.organizationId, 10, {
        includeLeads: canViewLeads,
        includeFollowUps: canViewFollowUps,
        includeCampaigns: canViewCampaigns,
      }),
    ]);

  const campaignsByStatus = CAMPAIGN_STATUSES.map((status) => ({
    status,
    count: campaigns.filter((campaign) => campaign.status === status).length,
  })).filter((entry) => entry.count > 0);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">CRM Dashboard</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Operational overview of Customers, Leads, and Campaigns.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {canViewCustomers ? <StatCard label="Total Customers" value={totalCustomers} /> : null}
        {canViewLeads ? <StatCard label="Total Leads" value={totalLeads} /> : null}
      </section>

      {canViewLeads ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Leads by Status</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {leadsByStage.length === 0 ? (
              <li className="text-foreground/60">No Leads yet.</li>
            ) : (
              leadsByStage.map((entry) => (
                <li key={entry.stageId} className="flex items-center justify-between">
                  <span>
                    {entry.stageName} <span className="text-foreground/60">({entry.bucket})</span>
                  </span>
                  <span className="font-medium">{entry.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {canViewLeads ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Leads by Source</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {leadsBySource.length === 0 ? (
              <li className="text-foreground/60">No Leads yet.</li>
            ) : (
              leadsBySource.map((entry) => (
                <li key={entry.sourceId} className="flex items-center justify-between">
                  <span>{entry.sourceName}</span>
                  <span className="font-medium">{entry.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {canViewCampaigns ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Campaign Summary</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {campaignsByStatus.length === 0 ? (
              <li className="text-foreground/60">No Campaigns yet.</li>
            ) : (
              campaignsByStatus.map((entry) => (
                <li key={entry.status} className="flex items-center justify-between">
                  <span>{entry.status}</span>
                  <span className="font-medium">{entry.count}</span>
                </li>
              ))
            )}
          </ul>
          <p className="text-foreground/60 mt-3 text-xs">{campaigns.length} Campaign(s) total.</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Recent Activities</h2>
          <Link href="/activity" className="text-xs underline underline-offset-4">
            View all →
          </Link>
        </div>
        <ul className="flex flex-col">
          {activity.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No activity yet.</li>
          ) : (
            activity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <span>
                  <span className="text-foreground/50 mr-2 text-xs">{entry.source}</span>
                  {entry.label}
                </span>
                <span className="text-foreground/60 whitespace-nowrap">
                  {new Date(entry.occurredAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/customers" className="underline underline-offset-4">
          Customers →
        </Link>
        <Link href="/leads" className="underline underline-offset-4">
          Leads →
        </Link>
        <Link href="/campaigns" className="underline underline-offset-4">
          Campaigns →
        </Link>
      </nav>
    </div>
  );
}

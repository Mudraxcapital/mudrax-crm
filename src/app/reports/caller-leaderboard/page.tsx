import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import {
  callerLeaderboardQuerySchema,
  getCallerLeaderboard,
} from "@/modules/reports";
import { CallerLeaderboardTable } from "@/modules/reports/presentation/components/CallerLeaderboardTable";
import { listCampaigns } from "@/modules/campaigns";
import { leadCatalogs } from "@/modules/leads";
import { listUsers } from "@/modules/users";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader, StatCard } from "@/shared/ui/Card";
import { TabNav } from "@/shared/ui/Tabs";
import { Button } from "@/shared/ui/Button";

const REPORT_TABS = [
  { href: "/reports", label: "Overview" },
  { href: "/reports/leads", label: "Leads" },
  { href: "/reports/customers", label: "Customers" },
  { href: "/reports/campaigns", label: "Campaigns" },
  { href: "/reports/telephony", label: "Telephony" },
  { href: "/reports/caller-leaderboard", label: "Caller Leaderboard" },
  { href: "/reports/documents", label: "Documents" },
  { href: "/reports/notifications", label: "Notifications" },
  { href: "/reports/saved", label: "Saved" },
  { href: "/reports/dashboards", label: "Dashboards" },
];

const HIGHLIGHT_ICONS: Record<string, string> = {
  top_caller: "🥇",
  highest_connections: "🥈",
  best_conversion: "🥉",
  longest_talk: "⭐",
};

function optionalParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export default async function CallerLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { authContext } = await requirePermission("report.view");
  const query = await searchParams;

  const parsed = callerLeaderboardQuerySchema.safeParse({
    preset: optionalParam(query.preset) ?? "today",
    dateFrom: optionalParam(query.dateFrom),
    dateTo: optionalParam(query.dateTo),
    campaignId: optionalParam(query.campaignId),
    teamLeadId: optionalParam(query.teamLeadId),
    callerId: optionalParam(query.callerId),
    stageId: optionalParam(query.stageId),
    sortBy: optionalParam(query.sortBy) ?? "most_calls",
  });

  const filters = parsed.success
    ? parsed.data
    : callerLeaderboardQuerySchema.parse({ preset: "today", sortBy: "most_calls" });

  const visibleIds = authContext.hierarchy.visibleUserIds;
  const book = authContext.hierarchy.ownerManagerId
    ? { ownerManagerId: authContext.hierarchy.ownerManagerId }
    : undefined;

  const [leaderboard, campaigns, stages, users] = await Promise.all([
    getCallerLeaderboard(authContext.organizationId, filters),
    listCampaigns(authContext.organizationId, book),
    leadCatalogs.listStages(authContext.organizationId),
    listUsers({
      status: "ACTIVE",
      limit: 500,
      userIds: visibleIds ?? undefined,
    }),
  ]);

  const teamLeads = users.filter((user) => user.roleName === "Team Lead");
  const callers = users.filter(
    (user) => user.roleName === "Caller" || user.roleName === "Team Lead" || !user.roleName,
  );

  return (
    <PageSection>
      <PageHeader
        title="Caller Leaderboard"
        description="Enterprise caller performance across calls, outcomes, talk time, and conversions."
        actions={
          <Link href="/reports">
            <Button variant="secondary">Back to Reports</Button>
          </Link>
        }
      />

      <TabNav activeHref="/reports/caller-leaderboard" items={REPORT_TABS} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {leaderboard.highlights.map((card) => (
          <StatCard
            key={card.key}
            label={`${HIGHLIGHT_ICONS[card.key] ?? ""} ${card.label}`}
            value={card.employeeName ?? "—"}
            hint={card.valueLabel}
          />
        ))}
      </section>

      <Card>
        <CardHeader title="Filters" description="Date range, campaign, team lead, caller, and status." />
        <CardBody>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              Period
              <select
                name="preset"
                defaultValue={filters.preset}
                className="mx-input mt-1 w-full"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date</option>
              </select>
            </label>
            <label className="text-sm">
              From
              <input
                type="datetime-local"
                name="dateFrom"
                defaultValue={
                  filters.dateFrom
                    ? new Date(filters.dateFrom).toISOString().slice(0, 16)
                    : ""
                }
                className="mx-input mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              To
              <input
                type="datetime-local"
                name="dateTo"
                defaultValue={
                  filters.dateTo ? new Date(filters.dateTo).toISOString().slice(0, 16) : ""
                }
                className="mx-input mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              Sort by
              <select
                name="sortBy"
                defaultValue={filters.sortBy}
                className="mx-input mt-1 w-full"
              >
                <option value="most_calls">Most Calls</option>
                <option value="most_connections">Most Connections</option>
                <option value="highest_conversion">Highest Conversion</option>
                <option value="longest_talk_time">Longest Talk Time</option>
                <option value="fastest_follow_ups">Fastest Follow Ups</option>
              </select>
            </label>
            <label className="text-sm">
              Campaign
              <select
                name="campaignId"
                defaultValue={filters.campaignId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All campaigns</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Team Lead
              <select
                name="teamLeadId"
                defaultValue={filters.teamLeadId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All team leads</option>
                {teamLeads.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Caller
              <select
                name="callerId"
                defaultValue={filters.callerId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All callers</option>
                {callers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Status
              <select
                name="stageId"
                defaultValue={filters.stageId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All statuses</option>
                {stages
                  .filter((stage) => stage.isActive)
                  .map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" className="mx-btn mx-btn-primary w-full">
                Apply filters
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Leaderboard"
          description={`${leaderboard.rows.length} caller(s) · ${new Date(leaderboard.dateFrom).toLocaleString()} → ${new Date(leaderboard.dateTo).toLocaleString()}`}
        />
        <CardBody className="overflow-x-auto p-0 sm:p-0">
          <div className="p-4">
            <CallerLeaderboardTable
              rows={leaderboard.rows}
              outcomeColumns={leaderboard.outcomeColumns}
            />
          </div>
        </CardBody>
      </Card>
    </PageSection>
  );
}

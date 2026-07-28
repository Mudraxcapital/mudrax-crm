import Link from "next/link";
import { Card, CardBody, CardHeader, StatCard } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import {
  formatLeaderboardDuration,
  formatLeaderboardNumber,
  formatLeaderboardPercent,
  initialsFromName,
} from "../_lib/formatLeaderboard";
import type { LeaderboardCardDto, LeaderboardPageDto } from "../_lib/leaderboardTypes";
import type { LeaderboardPageQuery } from "../_lib/parseLeaderboardQuery";
import { LeaderboardCharts } from "./LeaderboardCharts";

function buildHref(
  query: LeaderboardPageQuery,
  patch: Partial<Record<string, string | undefined>>,
): string {
  const params = new URLSearchParams();
  const next = {
    preset: query.preset,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    campaignId: query.campaignId,
    teamLeadId: query.teamLeadId,
    sortBy: query.sortBy,
    q: query.q,
    selected: query.selected,
    drill: query.drill,
    ...patch,
  };

  for (const [key, value] of Object.entries(next)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

/** Format an ISO/date string for `<input type="datetime-local">` in local time. */
function toDatetimeLocalValue(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) return <Badge tone="neutral">Total</Badge>;
  if (rank === 1) return <Badge tone="success">#1</Badge>;
  if (rank === 2) return <Badge tone="info">#2</Badge>;
  if (rank === 3) return <Badge tone="warning">#3</Badge>;
  return <Badge tone="neutral">#{rank}</Badge>;
}

function Avatar({ card }: { card: LeaderboardCardDto }) {
  if (card.profilePhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={card.profilePhotoUrl}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="bg-accent-muted text-accent flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold">
      {initialsFromName(card.name)}
    </span>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted text-[10px] tracking-wide uppercase">{label}</p>
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RankingCard({
  card,
  selectHref,
  drillHref,
  selected,
}: {
  card: LeaderboardCardDto;
  selectHref: string;
  drillHref?: string;
  selected: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border px-3 py-3 transition-colors",
        selected
          ? "border-accent bg-accent-muted/40"
          : "border-border bg-surface hover:border-accent/40",
      ].join(" ")}
    >
      <Link href={selectHref} className="block">
        <div className="flex items-start gap-3">
          <Avatar card={card} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">{card.name}</p>
                <p className="text-muted truncate text-xs">
                  {card.designation}
                  {card.teamSize != null ? ` · Team size ${card.teamSize}` : ""}
                </p>
              </div>
              <RankBadge rank={card.rank} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MetricCell
                label="Calls"
                value={formatLeaderboardNumber(card.metrics.totalCalls)}
              />
              <MetricCell
                label="Connected"
                value={formatLeaderboardNumber(card.metrics.connectedCalls)}
              />
              <MetricCell
                label="Talk"
                value={formatLeaderboardDuration(card.metrics.talkTimeSeconds)}
              />
            </div>
          </div>
        </div>
      </Link>
      {drillHref ? (
        <div className="mt-2 border-t border-border pt-2">
          <Link
            href={drillHref}
            className="text-accent text-xs font-medium hover:underline underline-offset-4"
          >
            Open team →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function StatRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium tracking-tight">{label}</p>
        {hint ? <p className="text-muted text-xs">{hint}</p> : null}
      </div>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function LeaderboardView({
  data,
  query,
}: {
  data: LeaderboardPageDto;
  query: LeaderboardPageQuery;
}) {
  const { detail, isCallerOnly } = data;
  const summary = detail.summary;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Filters"
          description="Period, ranking metric, campaign, and team scope."
        />
        <CardBody>
          <form
            method="get"
            action="/leaderboard"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Applying filters returns to the filtered top-level view (drops drill/selection). */}
            <input type="hidden" name="selected" value="summary" />
            <label className="text-sm">
              Period
              <select name="preset" defaultValue={query.preset} className="mx-input mt-1 w-full">
                <option value="today">Today</option>
                <option value="this_week">Week</option>
                <option value="this_month">Month</option>
                <option value="this_year">Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </label>
            <label className="text-sm">
              From
              <input
                type="datetime-local"
                name="dateFrom"
                defaultValue={toDatetimeLocalValue(query.dateFrom)}
                className="mx-input mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              To
              <input
                type="datetime-local"
                name="dateTo"
                defaultValue={toDatetimeLocalValue(query.dateTo)}
                className="mx-input mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              Rank by
              <select name="sortBy" defaultValue={query.sortBy} className="mx-input mt-1 w-full">
                <option value="most_connections">Connected Calls</option>
                <option value="most_calls">Total Calls</option>
                <option value="highest_conversion">Conversion %</option>
                <option value="longest_talk_time">Talk Time</option>
                <option value="most_follow_ups_completed">Follow Ups Completed</option>
                <option value="most_won_leads">Won Leads</option>
              </select>
            </label>
            <label className="text-sm">
              Campaign
              <select
                name="campaignId"
                defaultValue={query.campaignId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All campaigns</option>
                {data.filterOptions.campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            {data.filterOptions.teamLeads.length > 0 ? (
              <label className="text-sm">
                Team
                <select
                  name="teamLeadId"
                  defaultValue={query.teamLeadId ?? ""}
                  className="mx-input mt-1 w-full"
                >
                  <option value="">All teams</option>
                  {data.filterOptions.teamLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {!isCallerOnly ? (
              <label className="text-sm sm:col-span-2 lg:col-span-2">
                Search employee
                <input
                  type="search"
                  name="q"
                  defaultValue={query.q ?? ""}
                  placeholder="Search by name"
                  className="mx-input mt-1 w-full"
                />
              </label>
            ) : null}
            <div className="flex items-end">
              <button type="submit" className="mx-btn mx-btn-primary w-full">
                Apply filters
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Rankings</h2>
            {data.drillId ? (
              <Link
                href={buildHref(query, { drill: undefined, selected: "summary" })}
                className="text-accent text-xs font-medium hover:underline underline-offset-4"
              >
                Back to parent
              </Link>
            ) : null}
          </div>
          {data.drillLabel ? (
            <p className="text-muted text-xs">Viewing: {data.drillLabel}</p>
          ) : null}
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {data.cards.map((card) => {
              const canDrill =
                !isCallerOnly &&
                (card.kind === "manager" || card.kind === "team_lead") &&
                card.id !== "summary" &&
                card.teamSize != null;
              return (
                <RankingCard
                  key={`${card.kind}-${card.id}`}
                  card={card}
                  selectHref={buildHref(query, { selected: card.id })}
                  drillHref={
                    canDrill
                      ? buildHref(query, { drill: card.id, selected: "summary" })
                      : undefined
                  }
                  selected={data.selectedId === card.id}
                />
              );
            })}
            {data.cards.length === 0 ? (
              <p className="text-muted rounded-lg border border-border px-3 py-6 text-center text-sm">
                No employees match the current filters.
              </p>
            ) : null}
          </div>
        </aside>

        <section className="space-y-4">
          <Card>
            <CardHeader
              title={detail.entity.name}
              description={
                isCallerOnly
                  ? "Your performance only."
                  : [
                      detail.entity.designation,
                      detail.managerName ? `Manager: ${detail.managerName}` : null,
                      detail.teamLeadName ? `Team Lead: ${detail.teamLeadName}` : null,
                      detail.status ? `Status: ${detail.status}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
              }
              actions={
                detail.email ? (
                  <span className="text-muted text-xs">{detail.email}</span>
                ) : null
              }
            />
            <CardBody className="space-y-1">
              {!isCallerOnly && detail.campaignNames.length > 0 ? (
                <p className="text-muted mb-3 text-xs">
                  Campaigns: {detail.campaignNames.slice(0, 6).join(", ")}
                  {detail.campaignNames.length > 6
                    ? ` +${detail.campaignNames.length - 6} more`
                    : ""}
                </p>
              ) : null}

              {isCallerOnly ? (
                <>
                  <StatRow
                    label="Today's Calls"
                    value={formatLeaderboardNumber(summary.callsToday)}
                  />
                  <StatRow
                    label="This Week"
                    value={formatLeaderboardNumber(summary.callsThisWeek)}
                  />
                  <StatRow
                    label="This Month"
                    value={formatLeaderboardNumber(summary.callsThisMonth)}
                  />
                  <StatRow
                    label="Connected Calls"
                    value={formatLeaderboardNumber(summary.connectedCalls)}
                  />
                  <StatRow
                    label="Conversion %"
                    value={formatLeaderboardPercent(summary.conversionRate)}
                  />
                  <StatRow
                    label="Pending Follow Ups"
                    value={formatLeaderboardNumber(summary.pendingFollowUps)}
                  />
                  <StatRow
                    label="Completed Follow Ups"
                    value={formatLeaderboardNumber(summary.followUpsCompleted)}
                  />
                </>
              ) : (
                <>
                  <StatRow
                    label="Total Calls"
                    value={formatLeaderboardNumber(summary.totalCalls)}
                  />
                  <StatRow
                    label="Incoming Calls"
                    value={formatLeaderboardNumber(summary.incomingCalls)}
                  />
                  <StatRow
                    label="Outgoing Calls"
                    value={formatLeaderboardNumber(summary.outgoingCalls)}
                  />
                  <StatRow
                    label="Connected Calls"
                    value={formatLeaderboardNumber(summary.connectedCalls)}
                  />
                  <StatRow
                    label="Attempted Calls"
                    value={formatLeaderboardNumber(summary.attemptedCalls)}
                  />
                  <StatRow
                    label="Missed Calls"
                    value={formatLeaderboardNumber(summary.missedCalls)}
                  />
                  <StatRow
                    label="Average Call Duration"
                    value={formatLeaderboardDuration(summary.averageCallDurationSeconds)}
                  />
                  <StatRow
                    label="Total Talk Time"
                    value={formatLeaderboardDuration(summary.totalTalkTimeSeconds)}
                  />
                  <StatRow
                    label="Calls Today"
                    value={formatLeaderboardNumber(summary.callsToday)}
                  />
                  <StatRow
                    label="Calls This Week"
                    value={formatLeaderboardNumber(summary.callsThisWeek)}
                  />
                  <StatRow
                    label="Calls This Month"
                    value={formatLeaderboardNumber(summary.callsThisMonth)}
                  />
                  <StatRow
                    label="Follow Ups Completed"
                    value={formatLeaderboardNumber(summary.followUpsCompleted)}
                  />
                  <StatRow
                    label="Pending Follow Ups"
                    value={formatLeaderboardNumber(summary.pendingFollowUps)}
                  />
                  <StatRow
                    label="Customers Contacted"
                    value={formatLeaderboardNumber(summary.customersContacted)}
                  />
                  <StatRow
                    label="Leads Converted"
                    value={formatLeaderboardNumber(summary.leadsConverted)}
                  />
                  <StatRow
                    label="Conversion Rate"
                    value={formatLeaderboardPercent(summary.conversionRate)}
                  />
                </>
              )}
            </CardBody>
          </Card>

          {!isCallerOnly ? (
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Connected"
                value={formatLeaderboardNumber(summary.connectedCalls)}
              />
              <StatCard
                label="Talk Time"
                value={formatLeaderboardDuration(summary.totalTalkTimeSeconds)}
              />
              <StatCard
                label="Converted"
                value={formatLeaderboardNumber(summary.leadsConverted)}
              />
              <StatCard
                label="Conversion"
                value={formatLeaderboardPercent(summary.conversionRate)}
              />
            </section>
          ) : null}

          <LeaderboardCharts
            callOutcomes={detail.callOutcomes}
            stageDistribution={detail.stageDistribution}
            conversionTrend={detail.conversionTrend}
            leadFunnel={detail.leadFunnel}
            campaignContribution={detail.campaignContribution}
            simplified={isCallerOnly}
          />

          {!isCallerOnly && detail.lossReasons.length > 0 ? (
            <Card>
              <CardHeader title="Loss Reasons" description="Closed-lost leads by catalog reason." />
              <CardBody className="space-y-1">
                {detail.lossReasons.slice(0, 12).map((reason) => (
                  <StatRow
                    key={reason.key}
                    label={reason.label}
                    value={formatLeaderboardNumber(reason.count)}
                  />
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Recent Activity"
              description={
                isCallerOnly
                  ? "Your recent calls in the selected period."
                  : "Recent calls for this selection."
              }
            />
            <CardBody className="space-y-1">
              {detail.recentActivity.length === 0 ? (
                <p className="text-muted text-sm">No recent call activity.</p>
              ) : (
                detail.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-muted truncate text-xs">{item.detail}</p>
                    </div>
                    <p className="text-muted shrink-0 text-xs tabular-nums">
                      {new Date(item.occurredAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}

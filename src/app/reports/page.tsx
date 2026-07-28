import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { emptyReportFilter, getAnalyticsDashboard, REPORT_TYPE_LABELS } from "@/modules/reports";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { TabNav } from "@/shared/ui/Tabs";
import { reportHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";
import { AnalyticsRangeFilter } from "./_components/AnalyticsRangeFilter";
import {
  DonutChart,
  FunnelBars,
  HorizontalBarChart,
  TrendLineChart,
  VerticalBarChart,
} from "./_components/AnalyticsCharts";
import { rangeToDateFrom, resolveAnalyticsRange } from "./_lib/analyticsRange";

export default async function AnalyticsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { authContext } = await requirePermission("report.view");
  const params = await searchParams;
  const canManage = hasPermission(authContext, "report.manage");
  const canManageDashboards = hasPermission(authContext, "dashboard.manage");
  const range = resolveAnalyticsRange(params.range);
  const now = new Date();
  const dateFrom = rangeToDateFrom(range, now);

  const dashboard = await getAnalyticsDashboard(authContext.organizationId, {
    ...emptyReportFilter(),
    ...reportHierarchyFilter(authContext),
    dateFrom: dateFrom.toISOString(),
    dateTo: now.toISOString(),
  });

  const trendLabel =
    dashboard.leadTrendGranularity === "daily"
      ? "Daily"
      : dashboard.leadTrendGranularity === "weekly"
        ? "Weekly"
        : "Monthly";

  return (
    <PageSection>
      <PageHeader
        title="Reports & Analytics"
        description="Where leads come from, where they stall, who converts, and what needs follow-up."
        actions={
          <>
            {canManage ? (
              <Link href="/reports/saved">
                <Button variant="secondary">Saved</Button>
              </Link>
            ) : null}
            {canManageDashboards ? (
              <Link href="/reports/dashboards">
                <Button>Dashboards</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <TabNav
        activeHref="/reports"
        items={[
          { href: "/reports", label: "Overview" },
          { href: "/reports/leads", label: "Leads" },
          { href: "/reports/customers", label: "Customers" },
          { href: "/reports/campaigns", label: "Campaigns" },
          { href: "/reports/telephony", label: "Telephony" },
          { href: "/reports/caller-leaderboard", label: "Caller Leaderboard" },
          { href: "/reports/documents", label: "Documents" },
          { href: "/reports/notifications", label: "Notifications" },
          ...(canManage ? [{ href: "/reports/saved", label: "Saved" }] : []),
          ...(canManageDashboards
            ? [{ href: "/reports/dashboards", label: "Dashboards" }]
            : []),
        ]}
      />

      <AnalyticsRangeFilter selected={range} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Customers" value={dashboard.totalCustomers} />
        <StatCard label="Leads" value={dashboard.totalLeads} />
        <StatCard
          label="Today's conversion"
          value={`${dashboard.todayConversions} (${Math.round(dashboard.todayConversionRate * 100)}%)`}
        />
        <StatCard label="This week — new leads" value={dashboard.weekLeadCount} />
        <StatCard label="This week — wins" value={dashboard.weekConversions} />
        <StatCard label="Calls today" value={dashboard.callsToday} />
        <StatCard label="Pending follow-ups" value={
          dashboard.followUpCompletion.find((e) => e.key === "pending")?.count ?? 0
        } />
        <StatCard label="Pending verification" value={dashboard.pendingDocumentVerification} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Leads by stage"
            description="Where leads are getting stuck in the pipeline."
          />
          <CardBody>
            <HorizontalBarChart data={dashboard.leadsByStatus} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Leads by source"
            description="Where leads are coming from."
          />
          <CardBody>
            <HorizontalBarChart data={dashboard.leadsBySource} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Conversion funnel"
            description="Fresh → Contacted → Interested → Documents → Approved → Disbursed"
          />
          <CardBody>
            <FunnelBars data={dashboard.conversionFunnel} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Lead trend (${trendLabel})`}
            description="New leads over the selected range."
          />
          <CardBody>
            <TrendLineChart data={dashboard.leadTrend} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Campaign performance"
            description="Which campaigns perform best by lead volume."
          />
          <CardBody>
            <VerticalBarChart data={dashboard.campaignPerformance.slice(0, 10)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Top campaigns"
            description="Highest lead volume campaigns."
          />
          <CardBody>
            <HorizontalBarChart data={dashboard.topCampaigns} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Top performing users"
            description="Assignees with the most leads."
          />
          <CardBody>
            <HorizontalBarChart data={dashboard.topPerformingUsers} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Sources with highest conversions"
            description="Won leads by source."
          />
          <CardBody>
            <HorizontalBarChart data={dashboard.sourceConversions} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Follow-up completion"
            description="Completed vs pending follow-ups."
          />
          <CardBody>
            <DonutChart data={dashboard.followUpCompletion} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Lead status distribution"
            description="Share of leads across pipeline stages."
          />
          <CardBody>
            <DonutChart data={dashboard.leadsByStatus} />
          </CardBody>
        </Card>
      </div>

      {canManage ? (
        <Card>
          <CardHeader title="Report types" description="Run operational reports from dedicated modules." />
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="rounded-lg border border-border px-3.5 py-3 text-sm"
              >
                <p className="font-medium tracking-tight">{label}</p>
                <p className="text-muted mt-0.5 font-mono text-[11px]">{key}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </PageSection>
  );
}

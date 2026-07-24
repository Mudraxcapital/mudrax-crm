import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getAnalyticsDashboard, REPORT_TYPE_LABELS } from "@/modules/reports";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import { TabNav } from "@/shared/ui/Tabs";

export default async function AnalyticsDashboardPage() {
  const { authContext } = await requirePermission("report.view");
  const canManage = hasPermission(authContext, "report.manage");
  const canManageDashboards = hasPermission(authContext, "dashboard.manage");
  const dashboard = await getAnalyticsDashboard(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Reports & Analytics"
        description="Live KPIs across customers, leads, campaigns, telephony, documents, and notifications."
        actions={
          <>
            <Link href="/reports/saved">
              <Button variant="secondary">Saved</Button>
            </Link>
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
          { href: "/reports/documents", label: "Documents" },
          { href: "/reports/notifications", label: "Notifications" },
          { href: "/reports/saved", label: "Saved" },
          { href: "/reports/dashboards", label: "Dashboards" },
        ]}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Customers" value={dashboard.totalCustomers} />
        <StatCard label="Leads" value={dashboard.totalLeads} />
        <StatCard label="Calls today" value={dashboard.callsToday} />
        <StatCard label="Connected calls" value={dashboard.connectedCalls} />
        <StatCard label="Missed calls" value={dashboard.missedCalls} />
        <StatCard label="Documents" value={dashboard.documentsUploaded} />
        <StatCard label="Pending verification" value={dashboard.pendingDocumentVerification} />
        <StatCard label="Notifications sent" value={dashboard.notificationsSent} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Leads by status" />
          <CardBody>
            <BarList
              data={dashboard.leadsByStatus.map((e) => ({
                key: e.key,
                label: e.label,
                value: e.count,
              }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Leads by source" />
          <CardBody>
            <BarList
              data={dashboard.leadsBySource.map((e) => ({
                key: e.key,
                label: e.label,
                value: e.count,
              }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Campaign performance" />
          <CardBody>
            <BarList
              data={dashboard.campaignPerformance.map((e) => ({
                key: e.key,
                label: e.label,
                value: e.count,
              }))}
            />
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

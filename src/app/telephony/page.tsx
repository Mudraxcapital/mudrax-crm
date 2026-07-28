import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getTelephonyDashboard } from "@/modules/telephony";
import { agentHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { TabNav } from "@/shared/ui/Tabs";
import { EmptyState } from "@/shared/ui/EmptyState";
import { telephonyTabItems } from "./_lib/telephonyTabs";

export default async function TelephonyDashboardPage() {
  const { authContext } = await requireAuth();
  if (!hasPermission(authContext, "telephony.dashboard.view")) {
    if (hasPermission(authContext, "call.view")) {
      redirect("/telephony/calls");
    }
    redirect("/unauthorized");
  }

  const agentScope = agentHierarchyFilter(authContext);
  const dashboard = await getTelephonyDashboard(
    authContext.organizationId,
    new Date(),
    agentScope,
  );

  const averageDurationLabel =
    dashboard.averageCallDurationSeconds !== null
      ? `${Math.floor(dashboard.averageCallDurationSeconds / 60)}m ${dashboard.averageCallDurationSeconds % 60}s`
      : "—";

  const isSelfScoped = Boolean(agentScope.agentUserId);

  return (
    <PageSection>
      <PageHeader
        title="Call Logs"
        description={
          isSelfScoped
            ? "Your call activity for today. Day-to-day calling happens from the Campaign Dashboard."
            : "Historical call activity. Day-to-day calling happens from the Campaign Dashboard."
        }
        actions={
          <Link href="/telephony/calls">
            <Button>{isSelfScoped ? "My calls" : "All calls"}</Button>
          </Link>
        }
      />

      <TabNav activeHref="/telephony" items={telephonyTabItems(authContext)} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Calls today" value={dashboard.callsToday} />
        <StatCard label="Connected" value={dashboard.connectedCallsToday} />
        <StatCard label="Missed" value={dashboard.missedCallsToday} />
        <StatCard label="Avg. duration" value={averageDurationLabel} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {!isSelfScoped ? (
          <Card>
            <CardHeader title="Calls by agent" />
            <CardBody>
              <BarList
                data={dashboard.callsByAgent.map((entry) => ({
                  key: entry.agentUserId ?? "unassigned",
                  label: entry.agentName,
                  value: entry.count,
                }))}
              />
            </CardBody>
          </Card>
        ) : null}

        <Card className={isSelfScoped ? "lg:col-span-2" : undefined}>
          <CardHeader
            title={isSelfScoped ? "My recent calls" : "Recent calls"}
            actions={
              <Link href="/telephony/calls">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <CardBody className="space-y-0 p-0">
            {dashboard.recentCalls.length === 0 ? (
              <EmptyState title="No calls yet" description="Click-to-call activity will show here." />
            ) : (
              <ul className="divide-y divide-border">
                {dashboard.recentCalls.map((call) => (
                  <li key={call.id}>
                    <Link
                      href={`/telephony/calls/${call.id}`}
                      className="hover:bg-accent-muted/30 flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Badge tone={statusTone(call.status)}>{call.status}</Badge>
                        <span className="font-medium">{call.direction}</span>
                      </span>
                      <span className="text-muted text-xs">Open →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageSection>
  );
}

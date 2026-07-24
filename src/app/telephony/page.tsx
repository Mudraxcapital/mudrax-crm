import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getTelephonyDashboard } from "@/modules/telephony";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { TabNav } from "@/shared/ui/Tabs";
import { EmptyState } from "@/shared/ui/EmptyState";

export default async function TelephonyDashboardPage() {
  const { authContext } = await requirePermission("telephony.dashboard.view");
  const dashboard = await getTelephonyDashboard(authContext.organizationId);

  const averageDurationLabel =
    dashboard.averageCallDurationSeconds !== null
      ? `${Math.floor(dashboard.averageCallDurationSeconds / 60)}m ${dashboard.averageCallDurationSeconds % 60}s`
      : "—";

  return (
    <PageSection>
      <PageHeader
        title="Telephony"
        description="Operational overview of today’s call activity."
        actions={
          <Link href="/telephony/calls">
            <Button>All calls</Button>
          </Link>
        }
      />

      <TabNav
        activeHref="/telephony"
        items={[
          { href: "/telephony", label: "Overview" },
          { href: "/telephony/calls", label: "Calls" },
          { href: "/telephony/missed-calls", label: "Missed" },
          { href: "/telephony/agent-sessions", label: "Agents" },
          { href: "/telephony/outcomes", label: "Outcomes" },
        ]}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Calls today" value={dashboard.callsToday} />
        <StatCard label="Connected" value={dashboard.connectedCallsToday} />
        <StatCard label="Missed" value={dashboard.missedCallsToday} />
        <StatCard label="Avg. duration" value={averageDurationLabel} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <Card>
          <CardHeader
            title="Recent calls"
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

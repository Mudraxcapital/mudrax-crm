import Link from "next/link";
import { requireInternalStaff } from "@/infra/auth/session";
import { getPermissionScope, hasPermission, hasRole } from "@/modules/rbac";
import { countCustomers } from "@/modules/customers";
import { countLeads, getLeadsByStage, listLeads } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { listFollowUps } from "@/modules/follow-ups";
import { listCallAttempts } from "@/modules/telephony";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";

const QUICK_LINKS = [
  { href: "/customers", label: "Customers", desc: "Identity records", perm: "customer.view" },
  { href: "/leads", label: "Leads", desc: "Pipeline inquiries", perm: "lead.view" },
  { href: "/leads/pipeline", label: "Pipeline", desc: "Kanban board", perm: "lead.view" },
  { href: "/campaigns", label: "Campaigns", desc: "Outbound distribution", perm: "campaign.view" },
  {
    href: "/telephony",
    label: "Telephony",
    desc: "Call operations",
    perm: "telephony.dashboard.view",
  },
  {
    href: "/documents",
    label: "Documents",
    desc: "Files & verification",
    perm: "documents.dashboard.view",
  },
  {
    href: "/notifications",
    label: "Notifications",
    desc: "Email · SMS · WhatsApp",
    perm: "notifications.dashboard.view",
  },
  { href: "/reports", label: "Reports", desc: "Analytics & KPIs", perm: "report.view" },
  { href: "/loans", label: "Loans", desc: "Applications & accounts", perm: "loan_application.view" },
  { href: "/crm", label: "CRM Overview", desc: "Operational dashboard", perm: null },
] as const;

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function Home() {
  const { session, authContext } = await requireInternalStaff();

  const canCustomers = hasPermission(authContext, "customer.view");
  const canLeads = hasPermission(authContext, "lead.view");
  const canCampaigns = hasPermission(authContext, "campaign.view");
  const canCall = hasPermission(authContext, "call.initiate");
  const leadScope = getPermissionScope(authContext, "lead.view");
  const isCallerWorkspace =
    hasRole(authContext, "Caller") &&
    !hasPermission(authContext, "campaign.manage") &&
    !hasPermission(authContext, "lead.import") &&
    leadScope === "SELF";

  if (isCallerWorkspace && canLeads) {
    const today = startOfToday();
    const myLeads = await listLeads(authContext.organizationId, {
      assignedToUserIds: [session.user.id],
      limit: 200,
    });
    const todayAssigned = myLeads.filter((lead) => new Date(lead.createdAt) >= today);
    const pendingCalls = myLeads.filter((lead) => lead.currentStageBucket !== "CLOSED");
    const completed = myLeads.filter((lead) => lead.currentStageBucket === "CLOSED");

    const [followUps, recentCalls] = await Promise.all([
      hasPermission(authContext, "follow_up.view")
        ? listFollowUps(authContext.organizationId, {
            assignedToUserIds: [session.user.id],
            limit: 50,
          }).catch(() => [])
        : Promise.resolve([]),
      hasPermission(authContext, "call.view")
        ? listCallAttempts(authContext.organizationId, {
            agentUserId: session.user.id,
            limit: 10,
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const todaysFollowUps = followUps.filter((item) => {
      const scheduled = new Date(item.scheduledFor);
      return scheduled >= today && item.status !== "COMPLETED" && item.status !== "CANCELLED";
    });

    return (
      <PageSection>
        <PageHeader
          title={`Caller workspace · ${session.user.fullName.split(" ")[0] ?? session.user.fullName}`}
          description="Your assigned leads only — call, disposition, and follow up."
          meta={
            <>
              <Badge tone="accent" dot>
                Caller
              </Badge>
              <Badge tone="neutral">{session.user.email}</Badge>
            </>
          }
          actions={
            <Link href="/leads">
              <Button variant="primary">My Assigned Leads</Button>
            </Link>
          }
        />

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Today's Assigned" value={todayAssigned.length} />
          <StatCard label="Pending Calls" value={pendingCalls.length} />
          <StatCard label="Completed Calls" value={completed.length} />
          <StatCard label="Today's Follow-ups" value={todaysFollowUps.length} />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="My Assigned Leads" description="Open work queue" />
            <CardBody className="space-y-2">
              {pendingCalls.slice(0, 8).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {lead.fullNameSnapshot}
                    </Link>
                    <p className="text-muted text-xs">
                      {lead.phoneSnapshot ?? "No phone"} · {lead.currentStageName}
                    </p>
                  </div>
                  {canCall && lead.phoneSnapshot ? (
                    <Link href={`/leads/${lead.id}#call`}>
                      <Button variant="secondary">Call</Button>
                    </Link>
                  ) : null}
                </div>
              ))}
              {pendingCalls.length === 0 ? (
                <p className="text-muted text-sm">No open assigned leads.</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent Calls" description="Your latest call attempts" />
            <CardBody className="space-y-2">
              {recentCalls.length === 0 ? (
                <p className="text-muted text-sm">No recent calls.</p>
              ) : (
                recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"
                  >
                    <span>
                      {call.leadId
                        ? `Lead ${call.leadId.slice(0, 8)}…`
                        : call.disposition ?? call.id.slice(0, 8)}
                    </span>
                    <span className="text-muted">{call.status}</span>
                  </div>
                ))
              )}
              {todaysFollowUps.length > 0 ? (
                <div className="pt-3">
                  <p className="text-sm font-medium">Today&apos;s follow-ups</p>
                  <ul className="text-muted mt-2 space-y-1 text-xs">
                    {todaysFollowUps.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        {new Date(item.scheduledFor).toLocaleTimeString()} · Lead{" "}
                        {item.leadId.slice(0, 8)}…
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </PageSection>
    );
  }

  const [totalCustomers, totalLeads, leadsByStage, campaigns] = await Promise.all([
    canCustomers ? countCustomers(authContext.organizationId) : Promise.resolve(0),
    canLeads ? countLeads(authContext.organizationId) : Promise.resolve(0),
    canLeads ? getLeadsByStage(authContext.organizationId) : Promise.resolve([]),
    canCampaigns ? listCampaigns(authContext.organizationId) : Promise.resolve([]),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const links = QUICK_LINKS.filter(
    (link) => link.perm === null || hasPermission(authContext, link.perm),
  );

  return (
    <PageSection>
      <PageHeader
        title={`Good day, ${session.user.fullName.split(" ")[0] ?? session.user.fullName}`}
        description="Your enterprise workspace for loan DSA operations."
        meta={
          <>
            <Badge tone="accent" dot>
              {authContext.roles.map((r) => r.name).join(", ") || "Member"}
            </Badge>
            <Badge tone="neutral">{session.user.email}</Badge>
          </>
        }
        actions={
          <Link href="/crm">
            <Button variant="secondary">Open CRM Dashboard</Button>
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canCustomers ? <StatCard label="Customers" value={totalCustomers} /> : null}
        {canLeads ? <StatCard label="Leads" value={totalLeads} /> : null}
        {canCampaigns ? <StatCard label="Active Campaigns" value={activeCampaigns} /> : null}
        <StatCard
          label="Permissions"
          value={Object.keys(authContext.permissions).length}
          hint="Effective access rights"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Jump back in"
            description="Most-used areas of the product, filtered to your permissions."
          />
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group hover:border-accent/40 hover:bg-accent-muted/30 flex items-start justify-between gap-3 rounded-lg border border-border px-3.5 py-3 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium tracking-tight group-hover:text-accent">
                    {link.label}
                  </p>
                  <p className="text-muted mt-0.5 text-xs">{link.desc}</p>
                </div>
                <span className="text-muted-foreground group-hover:text-accent text-sm">→</span>
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Pipeline snapshot" description="Leads by stage" />
          <CardBody>
            {canLeads ? (
              <BarList
                data={leadsByStage.map((entry) => ({
                  key: entry.stageId,
                  label: entry.stageName,
                  value: entry.count,
                }))}
              />
            ) : (
              <p className="text-muted text-sm">You don’t have lead visibility.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </PageSection>
  );
}

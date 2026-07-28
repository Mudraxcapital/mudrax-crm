import { requireInternalStaff } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { countCustomers } from "@/modules/customers";
import { countLeads, getLeadsByStage } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { getCallerDashboard } from "@/modules/caller-workspace";
import { CallerDashboardView } from "@/modules/caller-workspace/presentation/components/CallerDashboardView";
import Link from "next/link";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import {
  leadHierarchyFilter,
  managerBookFilter,
  resolveCustomerListOptions,
} from "@/shared/auth/applyHierarchyListFilter";

const QUICK_LINKS = [
  { href: "/customers", label: "Customers", desc: "Identity records", perm: "customer.view" },
  { href: "/leads", label: "All Leads", desc: "Pipeline inquiries", perm: "lead.view" },
  { href: "/leads/pipeline", label: "Pipeline", desc: "Kanban board", perm: "lead.view" },
  { href: "/leads/import", label: "Add from Excel", desc: "Bulk lead upload", perm: "lead.import" },
  { href: "/campaigns", label: "Campaigns", desc: "Outbound distribution", perm: "campaign.view" },
  {
    href: "/telephony",
    label: "Call Logs",
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
  { href: "/users", label: "User Management", desc: "Employees & roles", perm: "user.view" },
  { href: "/crm", label: "CRM Overview", desc: "Operational dashboard", perm: null },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requireInternalStaff();
  const params = await searchParams;
  const campaignId = typeof params.campaignId === "string" ? params.campaignId : null;

  if (isCallerWorkspaceUser(authContext)) {
    const dashboard = await getCallerDashboard({
      organizationId: authContext.organizationId,
      callerUserId: session.user.id,
      loginAt: session.user.loginAt,
      currentSessionId: session.user.sessionId || null,
      campaignId,
    });
    return <CallerDashboardView data={dashboard} callerName={session.user.fullName} />;
  }

  const canCustomers = hasPermission(authContext, "customer.view");
  const canLeads = hasPermission(authContext, "lead.view");
  const canCampaigns = hasPermission(authContext, "campaign.view");
  const book = managerBookFilter(authContext);
  const leadFilter = leadHierarchyFilter(authContext);
  const customerOptions = canCustomers
    ? await resolveCustomerListOptions(authContext)
    : null;

  const [totalCustomers, totalLeads, leadsByStage, campaigns] = await Promise.all([
    customerOptions
      ? countCustomers(authContext.organizationId, customerOptions)
      : Promise.resolve(0),
    canLeads ? countLeads(authContext.organizationId, leadFilter) : Promise.resolve(0),
    canLeads ? getLeadsByStage(authContext.organizationId, leadFilter) : Promise.resolve([]),
    canCampaigns ? listCampaigns(authContext.organizationId, book) : Promise.resolve([]),
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

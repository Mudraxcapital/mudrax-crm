import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getLoanDashboard } from "@/modules/loan-applications";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import { TabNav } from "@/shared/ui/Tabs";

export default async function LoanDashboardPage() {
  const { authContext } = await requirePermission("loan_application.view");
  const dashboard = await getLoanDashboard(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Loan Management"
        description="Applications, disbursements, and commission at a glance."
        actions={
          <Link href="/loan-applications">
            <Button>Applications</Button>
          </Link>
        }
      />

      <TabNav
        activeHref="/loans"
        items={[
          { href: "/loans", label: "Overview" },
          { href: "/banks", label: "Banks" },
          { href: "/loan-products", label: "Products" },
          { href: "/loan-applications", label: "Applications" },
          { href: "/loan-applications/offers", label: "Offers" },
          { href: "/loan-accounts", label: "Accounts" },
          { href: "/disbursements", label: "Disbursements" },
        ]}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Active applications" value={dashboard.activeApplications} />
        <StatCard label="Approved" value={dashboard.approved} />
        <StatCard label="Rejected" value={dashboard.rejected} />
        <StatCard label="Pending" value={dashboard.pending} />
        <StatCard label="Total disbursed" value={dashboard.totalDisbursedAmount} />
        <StatCard label="Commission pending" value={dashboard.commissionPending} />
        <StatCard label="Commission received" value={dashboard.commissionReceived} />
      </section>

      <Card>
        <CardHeader title="Top banks" description="By application volume" />
        <CardBody>
          <BarList
            data={dashboard.topBanks.map((bank) => ({
              key: bank.bankId,
              label: bank.bankName,
              value: bank.applicationCount,
            }))}
          />
        </CardBody>
      </Card>
    </PageSection>
  );
}

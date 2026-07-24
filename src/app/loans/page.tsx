import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getLoanDashboard } from "@/modules/loan-applications";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default async function LoanDashboardPage() {
  const { authContext } = await requirePermission("loan_application.view");
  const dashboard = await getLoanDashboard(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">← Home</Link>
      <div>
        <h1 className="text-lg font-semibold">Loan Dashboard</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Live KPIs across applications, disbursements, and commission.
        </p>
      </div>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Active Applications" value={dashboard.activeApplications} />
        <StatCard label="Approved" value={dashboard.approved} />
        <StatCard label="Rejected" value={dashboard.rejected} />
        <StatCard label="Pending" value={dashboard.pending} />
        <StatCard label="Total Disbursed" value={dashboard.totalDisbursedAmount} />
        <StatCard label="Commission Pending" value={dashboard.commissionPending} />
        <StatCard label="Commission Received" value={dashboard.commissionReceived} />
      </section>
      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Top Banks</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {dashboard.topBanks.length === 0 ? (
            <li className="text-foreground/60">No applications yet.</li>
          ) : (
            dashboard.topBanks.map((bank) => (
              <li key={bank.bankId} className="flex items-center justify-between">
                <span>{bank.bankName}</span>
                <span className="font-medium">{bank.applicationCount}</span>
              </li>
            ))
          )}
        </ul>
      </section>
      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/banks" className="underline underline-offset-4">Banks →</Link>
        <Link href="/loan-products" className="underline underline-offset-4">Loan Products →</Link>
        <Link href="/loan-applications" className="underline underline-offset-4">Applications →</Link>
        <Link href="/loan-accounts" className="underline underline-offset-4">Accounts →</Link>
        <Link href="/disbursements" className="underline underline-offset-4">Disbursements →</Link>
      </nav>
    </div>
  );
}

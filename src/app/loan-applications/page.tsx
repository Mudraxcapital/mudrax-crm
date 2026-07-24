import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listLoanApplications } from "@/modules/loan-applications";
import { listLoanProducts } from "@/modules/loan-products";
import { LoanApplicationForm } from "@/modules/loan-applications/presentation/components/LoanApplicationForm";
import { createLoanApplicationAction } from "@/modules/loan-applications/presentation/controllers/createLoanApplication.action";

export default async function LoanApplicationsPage() {
  const { authContext } = await requirePermission("loan_application.view");
  const canCreate = hasPermission(authContext, "loan_application.create");
  const [apps, products] = await Promise.all([
    listLoanApplications(authContext.organizationId),
    listLoanProducts(authContext.organizationId, { status: "ACTIVE" }),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/loans" className="text-sm underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-lg font-semibold">Loan Applications</h1>
        <p className="text-foreground/60 mt-1 text-sm">Pipeline from draft through approval.</p>
      </div>
      <nav className="flex gap-4 text-sm">
        <Link href="/loan-applications/offers" className="underline underline-offset-4">Loan Offers →</Link>
      </nav>
      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10">
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tenure</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 ? (
              <tr><td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">No applications yet.</td></tr>
            ) : apps.map((a) => (
              <tr key={a.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{a.requestedAmount}</td>
                <td className="px-4 py-3">{a.applicationStatusName ?? a.applicationStatusBucket}</td>
                <td className="px-4 py-3">{a.requestedTenureMonths}m</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/loan-applications/${a.id}`} className="underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canCreate ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Create Application</h2>
          <div className="mt-4">
            <LoanApplicationForm action={createLoanApplicationAction} products={products} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

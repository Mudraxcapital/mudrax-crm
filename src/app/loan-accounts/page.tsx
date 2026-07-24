import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listLoanAccounts } from "@/modules/loan-accounts";

export default async function LoanAccountsPage() {
  const { authContext } = await requirePermission("loan_account.view");
  const accounts = await listLoanAccounts(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/loans" className="text-sm underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-lg font-semibold">Loan Accounts</h1>
        <p className="text-foreground/60 mt-1 text-sm">Accounts opened after first disbursement.</p>
      </div>
      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10">
              <th className="px-4 py-3 font-medium">Account #</th>
              <th className="px-4 py-3 font-medium">Sanction</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">No accounts yet.</td></tr>
            ) : accounts.map((a) => (
              <tr key={a.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{a.accountNumber}</td>
                <td className="px-4 py-3">{a.sanctionedAmount}</td>
                <td className="px-4 py-3">{a.isActive ? "Active" : (a.loanStatusName ?? "Closed")}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/loan-accounts/${a.id}`} className="underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

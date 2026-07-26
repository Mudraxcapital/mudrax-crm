import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listCustomers } from "@/modules/customers";
import { listLoanAccounts } from "@/modules/loan-accounts";
import { nameFromMap } from "@/shared/ui/displayName";

export default async function LoanAccountsPage() {
  const { authContext } = await requirePermission("loan_account.view");
  const [accounts, customers] = await Promise.all([
    listLoanAccounts(authContext.organizationId),
    listCustomers(authContext.organizationId),
  ]);
  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.fullName]));

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link
        href="/loans"
        className="text-sm text-accent hover:text-accent hover:underline underline-offset-4"
      >
        ← Loan Dashboard
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Loan Accounts</h1>
        <p className="text-muted mt-1 text-sm">Accounts opened after first disbursement.</p>
      </div>
      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Account #</th>
              <th className="px-4 py-3 font-medium">Sanction</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted px-4 py-6 text-center">
                  No accounts yet.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {nameFromMap(customerNameById, a.customerId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.accountNumber}</td>
                  <td className="px-4 py-3">{a.sanctionedAmount}</td>
                  <td className="px-4 py-3">
                    {a.isActive ? "Active" : (a.loanStatusName ?? "Closed")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/loan-accounts/${a.id}`}
                      className="text-accent hover:text-accent hover:underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCustomers } from "@/modules/customers";
import { listDisbursements, listCommissions } from "@/modules/disbursements";
import { listLoanApplications } from "@/modules/loan-applications";
import { RecordDisbursementForm } from "@/modules/disbursements/presentation/components/RecordDisbursementForm";
import { recordDisbursementAction } from "@/modules/disbursements/presentation/controllers/recordDisbursement.action";
import { nameFromMap } from "@/shared/ui/displayName";

export default async function DisbursementsPage() {
  const { authContext } = await requirePermission("disbursement.view");
  const canRecord = hasPermission(authContext, "disbursement.record");
  const canCommission = hasPermission(authContext, "commission.view");
  const [disbursements, commissions, applications, customers] = await Promise.all([
    listDisbursements(authContext.organizationId),
    canCommission ? listCommissions(authContext.organizationId) : Promise.resolve([]),
    canRecord ? listLoanApplications(authContext.organizationId) : Promise.resolve([]),
    canRecord ? listCustomers(authContext.organizationId) : Promise.resolve([]),
  ]);
  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.fullName]));
  const applicationOptions = applications.map((app) => ({
    id: app.id,
    label: `${nameFromMap(customerNameById, app.customerId)} · ${app.requestedAmount} · ${app.applicationStatusName ?? app.applicationStatusBucket ?? "Application"}`,
  }));

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/loans" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Disbursements & Commission</h1>
        <p className="text-muted mt-1 text-sm">Funds release events and DSA commission tracking.</p>
      </div>
      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {disbursements.length === 0 ? (
              <tr><td colSpan={4} className="text-muted px-4 py-6 text-center">No disbursements yet.</td></tr>
            ) : disbursements.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{d.bankReferenceNumber}</td>
                <td className="px-4 py-3">{d.amount}</td>
                <td className="px-4 py-3">{d.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/disbursements/${d.id}`} className="text-accent hover:text-accent hover:underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canCommission ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Commissions</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {commissions.length === 0 ? (
              <li className="text-muted">No commissions yet.</li>
            ) : commissions.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>Expected {c.expectedAmount} · Received {c.receivedAmount ?? "—"}</span>
                <span>{c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {canRecord ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Record Disbursement</h2>
          <div className="mt-4">
            <RecordDisbursementForm
              action={recordDisbursementAction}
              applications={applicationOptions}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listDisbursements, listCommissions } from "@/modules/disbursements";
import { RecordDisbursementForm } from "@/modules/disbursements/presentation/components/RecordDisbursementForm";
import { recordDisbursementAction } from "@/modules/disbursements/presentation/controllers/recordDisbursement.action";

export default async function DisbursementsPage() {
  const { authContext } = await requirePermission("disbursement.view");
  const canRecord = hasPermission(authContext, "disbursement.record");
  const canCommission = hasPermission(authContext, "commission.view");
  const [disbursements, commissions] = await Promise.all([
    listDisbursements(authContext.organizationId),
    canCommission ? listCommissions(authContext.organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/loans" className="text-sm underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-lg font-semibold">Disbursements & Commission</h1>
        <p className="text-foreground/60 mt-1 text-sm">Funds release events and DSA commission tracking.</p>
      </div>
      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10">
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {disbursements.length === 0 ? (
              <tr><td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">No disbursements yet.</td></tr>
            ) : disbursements.map((d) => (
              <tr key={d.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{d.bankReferenceNumber}</td>
                <td className="px-4 py-3">{d.amount}</td>
                <td className="px-4 py-3">{d.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/disbursements/${d.id}`} className="underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canCommission ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Commissions</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {commissions.length === 0 ? (
              <li className="text-foreground/60">No commissions yet.</li>
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
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Record Disbursement</h2>
          <div className="mt-4"><RecordDisbursementForm action={recordDisbursementAction} /></div>
        </section>
      ) : null}
    </div>
  );
}

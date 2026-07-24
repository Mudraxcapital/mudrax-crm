import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getDisbursement, DisbursementNotFoundError } from "@/modules/disbursements";
import { CommissionStatusForm } from "@/modules/disbursements/presentation/components/CommissionStatusForm";
import { updateCommissionStatusAction } from "@/modules/disbursements/presentation/controllers/updateCommissionStatus.action";

export default async function DisbursementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { authContext } = await requirePermission("disbursement.view");
  const canReconcile = hasPermission(authContext, "commission.reconcile");

  let d;
  try {
    d = await getDisbursement(id, authContext.organizationId);
  } catch (error) {
    if (error instanceof DisbursementNotFoundError) notFound();
    throw error;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/disbursements" className="text-sm underline underline-offset-4">← Disbursements</Link>
      <div>
        <h1 className="text-lg font-semibold">Disbursement</h1>
        <p className="text-foreground/60 mt-1 text-sm font-mono">{d.bankReferenceNumber}</p>
        <p className="mt-2 text-sm">{d.amount} · tranche {d.trancheNumber} · {d.status}</p>
        {d.loanAccountId ? (
          <p className="mt-2 text-sm">
            Loan Account:{" "}
            <Link href={`/loan-accounts/${d.loanAccountId}`} className="underline underline-offset-4">{d.loanAccountId}</Link>
          </p>
        ) : null}
      </div>
      {d.commission ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Commission</h2>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-foreground/60">Expected</dt><dd>{d.commission.expectedAmount}</dd>
            <dt className="text-foreground/60">Received</dt><dd>{d.commission.receivedAmount ?? "—"}</dd>
            <dt className="text-foreground/60">Status</dt><dd>{d.commission.status}</dd>
          </dl>
          {canReconcile ? (
            <div className="mt-6">
              <CommissionStatusForm
                action={updateCommissionStatusAction.bind(null, d.commission.id)}
                current={d.commission.status}
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

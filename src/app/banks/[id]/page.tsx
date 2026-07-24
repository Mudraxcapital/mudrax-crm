import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  BankNotFoundError,
  getBank,
  listBankBranches,
  listCommissionPolicies,
} from "@/modules/banks";
import { BankForm } from "@/modules/banks/presentation/components/BankForm";
import { BankBranchForm } from "@/modules/banks/presentation/components/BankBranchForm";
import { CommissionPolicyForm } from "@/modules/banks/presentation/components/CommissionPolicyForm";
import { PublishPolicyButton } from "@/modules/banks/presentation/components/PublishPolicyButton";
import { updateBankAction } from "@/modules/banks/presentation/controllers/updateBank.action";
import { createBankBranchAction } from "@/modules/banks/presentation/controllers/createBankBranch.action";
import { createCommissionPolicyAction } from "@/modules/banks/presentation/controllers/createCommissionPolicy.action";

export default async function BankDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { authContext } = await requirePermission("bank.view");
  const canManage = hasPermission(authContext, "bank.manage");
  const canPublish = hasPermission(authContext, "commission_policy.publish");

  let bank;
  try {
    bank = await getBank(id, authContext.organizationId);
  } catch (error) {
    if (error instanceof BankNotFoundError) notFound();
    throw error;
  }

  const branches = await listBankBranches(bank.id);
  const policies = await listCommissionPolicies(bank.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/banks" className="text-sm underline underline-offset-4">← Banks</Link>
      <div>
        <h1 className="text-lg font-semibold">{bank.name}</h1>
        <p className="text-foreground/60 mt-1 text-sm font-mono">{bank.code} · {bank.status}</p>
      </div>

      {canManage ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Update Bank</h2>
          <div className="mt-4">
            <BankForm
              action={updateBankAction.bind(null, bank.id)}
              defaults={{ name: bank.name, code: bank.code, status: bank.status }}
              submitLabel="Save changes"
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Bank Branches</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {branches.length === 0 ? (
            <li className="text-foreground/60">No branches yet.</li>
          ) : (
            branches.map((b) => (
              <li key={b.id} className="flex justify-between">
                <span>{b.name} <span className="text-foreground/50 font-mono text-xs">({b.code})</span></span>
                <span>{b.status}</span>
              </li>
            ))
          )}
        </ul>
        {canManage ? (
          <div className="mt-6">
            <BankBranchForm action={createBankBranchAction.bind(null, bank.id)} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Commission Policies</h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {policies.length === 0 ? (
            <li className="text-foreground/60">No policies yet.</li>
          ) : (
            policies.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4">
                <span>
                  v{p.versionNumber} · {p.status} · rate{" "}
                  {String((p.rateStructure as { ratePercent?: number }).ratePercent ?? "—")}%
                </span>
                {canPublish && p.status === "DRAFTED" ? (
                  <PublishPolicyButton bankId={bank.id} policyId={p.id} />
                ) : null}
              </li>
            ))
          )}
        </ul>
        {canPublish ? (
          <div className="mt-6">
            <CommissionPolicyForm action={createCommissionPolicyAction.bind(null, bank.id)} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

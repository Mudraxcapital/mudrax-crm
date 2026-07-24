import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listBanks } from "@/modules/banks";
import { BankForm } from "@/modules/banks/presentation/components/BankForm";
import { createBankAction } from "@/modules/banks/presentation/controllers/createBank.action";

export default async function BanksPage() {
  const { authContext } = await requirePermission("bank.view");
  const canManage = hasPermission(authContext, "bank.manage");
  const banks = await listBanks(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/loans" className="text-sm underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-lg font-semibold">Banks</h1>
        <p className="text-foreground/60 mt-1 text-sm">Lending partners and NBFC master data.</p>
      </div>
      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {banks.length === 0 ? (
              <tr><td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">No Banks yet.</td></tr>
            ) : banks.map((bank) => (
              <tr key={bank.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="px-4 py-3">{bank.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{bank.code}</td>
                <td className="px-4 py-3">{bank.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/banks/${bank.id}`} className="underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canManage ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Create Bank</h2>
          <div className="mt-4"><BankForm action={createBankAction} /></div>
        </section>
      ) : null}
    </div>
  );
}

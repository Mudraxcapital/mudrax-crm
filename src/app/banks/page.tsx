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
    <div className="mx-page flex flex-col gap-6">
      <Link href="/loans" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Banks</h1>
        <p className="text-muted mt-1 text-sm">Lending partners and NBFC master data.</p>
      </div>
      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {banks.length === 0 ? (
              <tr><td colSpan={4} className="text-muted px-4 py-6 text-center">No Banks yet.</td></tr>
            ) : banks.map((bank) => (
              <tr key={bank.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{bank.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{bank.code}</td>
                <td className="px-4 py-3">{bank.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/banks/${bank.id}`} className="text-accent hover:text-accent hover:underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canManage ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Create Bank</h2>
          <div className="mt-4"><BankForm action={createBankAction} /></div>
        </section>
      ) : null}
    </div>
  );
}

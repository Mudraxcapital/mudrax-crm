import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listBanks } from "@/modules/banks";
import { listLoanProducts, listLoanProductTypes } from "@/modules/loan-products";
import { LoanProductForm } from "@/modules/loan-products/presentation/components/LoanProductForm";
import { createLoanProductAction } from "@/modules/loan-products/presentation/controllers/createLoanProduct.action";

export default async function LoanProductsPage() {
  const { authContext } = await requirePermission("loan_product.view");
  const canManage = hasPermission(authContext, "loan_product.manage");
  const [products, banks, types] = await Promise.all([
    listLoanProducts(authContext.organizationId),
    listBanks(authContext.organizationId, { status: "ACTIVE" }),
    listLoanProductTypes(authContext.organizationId),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/loans" className="text-sm underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-lg font-semibold">Loan Products</h1>
        <p className="text-foreground/60 mt-1 text-sm">Products offered by Banks with rate/tenure/eligibility metadata.</p>
      </div>
      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">No products yet.</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{p.minInterestRate}%–{p.maxInterestRate}%</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/loan-products/${p.id}`} className="underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canManage ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Create Loan Product</h2>
          <div className="mt-4">
            <LoanProductForm action={createLoanProductAction} banks={banks} productTypes={types} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

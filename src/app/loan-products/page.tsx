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
    <div className="mx-page flex flex-col gap-6">
      <Link href="/loans" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Loan Products</h1>
        <p className="text-muted mt-1 text-sm">Products offered by Banks with rate/tenure/eligibility metadata.</p>
      </div>
      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={4} className="text-muted px-4 py-6 text-center">No products yet.</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{p.minInterestRate}%–{p.maxInterestRate}%</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/loan-products/${p.id}`} className="text-accent hover:text-accent hover:underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canManage ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Create Loan Product</h2>
          <div className="mt-4">
            <LoanProductForm action={createLoanProductAction} banks={banks} productTypes={types} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listBanks } from "@/modules/banks";
import {
  getLoanProductOrThrow,
  listLoanProductTypes,
  LoanProductNotFoundError,
} from "@/modules/loan-products";
import { LoanProductForm } from "@/modules/loan-products/presentation/components/LoanProductForm";
import { updateLoanProductAction } from "@/modules/loan-products/presentation/controllers/updateLoanProduct.action";

export default async function LoanProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { authContext } = await requirePermission("loan_product.view");
  const canManage = hasPermission(authContext, "loan_product.manage");

  let product;
  try {
    product = await getLoanProductOrThrow(id, authContext.organizationId);
  } catch (error) {
    if (error instanceof LoanProductNotFoundError) notFound();
    throw error;
  }

  const [banks, types] = await Promise.all([
    listBanks(authContext.organizationId),
    listLoanProductTypes(authContext.organizationId),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/loan-products" className="text-sm underline underline-offset-4">← Loan Products</Link>
      <div>
        <h1 className="text-lg font-semibold">{product.name}</h1>
        <p className="text-foreground/60 mt-1 text-sm">{product.status} · {product.variant}</p>
      </div>
      {canManage ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Update product</h2>
          <div className="mt-4">
            <LoanProductForm
              action={updateLoanProductAction.bind(null, product.id)}
              banks={banks}
              productTypes={types}
              submitLabel="Save changes"
              defaults={{
                bankId: product.bankId,
                loanProductTypeId: product.loanProductTypeId,
                name: product.name,
                variant: product.variant,
                minInterestRate: product.minInterestRate,
                maxInterestRate: product.maxInterestRate,
                minTenureMonths: String(product.minTenureMonths),
                maxTenureMonths: String(product.maxTenureMonths),
                minLoanAmount: product.minLoanAmount,
                maxLoanAmount: product.maxLoanAmount,
                status: product.status,
                eligibilityRulesJson: product.eligibilityRules
                  ? JSON.stringify(product.eligibilityRules, null, 2)
                  : "",
              }}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

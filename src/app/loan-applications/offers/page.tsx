import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listBanks } from "@/modules/banks";
import { listLoanProducts } from "@/modules/loan-products";
import { OfferWorkspace } from "@/modules/loan-applications/presentation/components/OfferWorkspace";

export default async function LoanOffersPage() {
  const { authContext } = await requirePermission("loan_offer.manage");
  const canManage = hasPermission(authContext, "loan_offer.manage");
  const canEligibility = hasPermission(authContext, "eligibility.compute");
  const [banks, products] = await Promise.all([
    listBanks(authContext.organizationId, { status: "ACTIVE" }),
    listLoanProducts(authContext.organizationId, { status: "ACTIVE" }),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/loan-applications" className="text-sm underline underline-offset-4">← Applications</Link>
      <div>
        <h1 className="text-lg font-semibold">Loan Offers</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Compute eligibility, generate offers, and accept/reject to seed an application.
        </p>
      </div>
      {(canManage || canEligibility) ? (
        <OfferWorkspace banks={banks} products={products} canEligibility={canEligibility} canManage={canManage} />
      ) : null}
    </div>
  );
}

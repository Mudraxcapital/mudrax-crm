import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listBanks } from "@/modules/banks";
import { listCustomers } from "@/modules/customers";
import { listLeads } from "@/modules/leads";
import { listLoanProducts } from "@/modules/loan-products";
import { OfferWorkspace } from "@/modules/loan-applications/presentation/components/OfferWorkspace";

export default async function LoanOffersPage() {
  const { authContext } = await requirePermission("loan_offer.manage");
  const canManage = hasPermission(authContext, "loan_offer.manage");
  const canEligibility = hasPermission(authContext, "eligibility.compute");
  const [banks, products, customers, leads] = await Promise.all([
    listBanks(authContext.organizationId, { status: "ACTIVE" }),
    listLoanProducts(authContext.organizationId, { status: "ACTIVE" }),
    listCustomers(authContext.organizationId),
    listLeads(authContext.organizationId),
  ]);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/loan-applications" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">← Applications</Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Loan Offers</h1>
        <p className="text-muted mt-1 text-sm">
          Compute eligibility, generate offers, and accept/reject to seed an application.
        </p>
      </div>
      {(canManage || canEligibility) ? (
        <OfferWorkspace
          banks={banks}
          products={products}
          customers={customers.map((customer) => ({
            id: customer.id,
            fullName: customer.fullName,
          }))}
          leads={leads.map((lead) => ({
            id: lead.id,
            fullName: lead.fullNameSnapshot,
          }))}
          canEligibility={canEligibility}
          canManage={canManage}
        />
      ) : null}
    </div>
  );
}

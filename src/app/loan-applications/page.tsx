import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCustomers } from "@/modules/customers";
import { listLeads } from "@/modules/leads";
import { listLoanApplications } from "@/modules/loan-applications";
import { listLoanProducts } from "@/modules/loan-products";
import { LoanApplicationForm } from "@/modules/loan-applications/presentation/components/LoanApplicationForm";
import { createLoanApplicationAction } from "@/modules/loan-applications/presentation/controllers/createLoanApplication.action";
import { nameFromMap } from "@/shared/ui/displayName";
import {
  filterLoanAppsByVisibility,
  resolveCustomerListOptions,
  resolveVisibleOwnerIds,
  visibleLeadsFilter,
} from "@/shared/auth/applyHierarchyListFilter";

export default async function LoanApplicationsPage() {
  const { authContext } = await requirePermission("loan_application.view");
  const canCreate = hasPermission(authContext, "loan_application.create");
  const visibility = await resolveVisibleOwnerIds(authContext);
  const customerOptions = await resolveCustomerListOptions(authContext, { limit: 10_000 });
  const leadFilter = visibleLeadsFilter(authContext, {
    permissionCode: "lead.view",
    actorUserId: authContext.userId,
  });

  const [allApps, products, customers, leads] = await Promise.all([
    listLoanApplications(authContext.organizationId),
    listLoanProducts(authContext.organizationId, { status: "ACTIVE" }),
    listCustomers(authContext.organizationId, customerOptions),
    listLeads(authContext.organizationId, { ...leadFilter, limit: 10_000 }),
  ]);
  const apps = filterLoanAppsByVisibility(allApps, visibility);
  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.fullName]));

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/loans" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">← Loan Dashboard</Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Loan Applications</h1>
        <p className="text-muted mt-1 text-sm">Pipeline from draft through approval.</p>
      </div>
      <nav className="flex gap-4 text-sm">
        <Link href="/loan-applications/offers" className="text-accent hover:text-accent hover:underline underline-offset-4">Loan Offers →</Link>
      </nav>
      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tenure</th>
              <th className="px-4 py-3">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 ? (
              <tr><td colSpan={5} className="text-muted px-4 py-6 text-center">No applications yet.</td></tr>
            ) : apps.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{nameFromMap(customerNameById, a.customerId)}</td>
                <td className="px-4 py-3">{a.requestedAmount}</td>
                <td className="px-4 py-3">{a.applicationStatusName ?? a.applicationStatusBucket}</td>
                <td className="px-4 py-3">{a.requestedTenureMonths}m</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/loan-applications/${a.id}`} className="text-accent hover:text-accent hover:underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canCreate ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Create Application</h2>
          <div className="mt-4">
            <LoanApplicationForm
              action={createLoanApplicationAction}
              products={products}
              customers={customers.map((customer) => ({
                id: customer.id,
                fullName: customer.fullName,
              }))}
              leads={leads.map((lead) => ({
                id: lead.id,
                fullName: lead.fullNameSnapshot,
                customerId: lead.customerId,
              }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCustomers, listDuplicateCandidates } from "@/modules/customers";
import { dismissDuplicateAction } from "@/modules/customers/presentation/controllers/duplicate.actions";
import { DetectDuplicatesForm } from "@/modules/customers/presentation/components/DetectDuplicatesForm";
import { MergeCustomersForm } from "@/modules/customers/presentation/components/MergeCustomersForm";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { nameFromMap } from "@/shared/ui/displayName";
import { resolveCustomerListOptions } from "@/shared/auth/applyHierarchyListFilter";

export default async function CustomerDuplicatesPage() {
  const { authContext } = await requirePermission("customer.duplicate.view");
  const canMerge = hasPermission(authContext, "customer.merge");
  const listOptions = await resolveCustomerListOptions(authContext);
  const visibleCustomerIds = listOptions.customerIds
    ? new Set(listOptions.customerIds)
    : null;

  const [candidates, customers] = await Promise.all([
    listDuplicateCandidates(authContext.organizationId, "DETECTED"),
    listCustomers(authContext.organizationId, listOptions),
  ]);

  const scopedCandidates = visibleCustomerIds
    ? candidates.filter(
        (candidate) =>
          visibleCustomerIds.has(candidate.customerAId) &&
          visibleCustomerIds.has(candidate.customerBId),
      )
    : candidates;

  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.fullName]));
  const customerOptions = customers.map((customer) => ({
    id: customer.id,
    fullName: customer.fullName,
  }));

  return (
    <PageSection>
      <PageHeader
        title="Duplicate Detection"
        description="Same phone or email matches pending human review. Score 1 means both phone and email match."
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Duplicate Detection" },
        ]}
        actions={<DetectDuplicatesForm />}
      />

      <section className="mx-card overflow-hidden">
        <ul className="flex flex-col">
          {scopedCandidates.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">
              No open duplicate candidates.
            </li>
          ) : (
            scopedCandidates.map((candidate) => {
              const nameA = nameFromMap(customerNameById, candidate.customerAId);
              const nameB = nameFromMap(customerNameById, candidate.customerBId);
              return (
                <li
                  key={candidate.id}
                  className="border-b border-border px-4 py-4 text-sm last:border-0"
                >
                  <p className="font-medium">{candidate.matchType}</p>
                  <p className="mt-1">
                    <span className="font-medium">{nameA}</span>
                    <span className="text-muted mx-2">↔</span>
                    <span className="font-medium">{nameB}</span>
                    {candidate.matchScore !== null ? (
                      <span className="text-muted ml-2 text-xs">
                        score {candidate.matchScore.toFixed(2)}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={`/customers/${candidate.customerAId}`}
                      className="text-accent hover:text-accent hover:underline underline-offset-4"
                    >
                      View {nameA}
                    </Link>
                    <Link
                      href={`/customers/${candidate.customerBId}`}
                      className="text-accent hover:text-accent hover:underline underline-offset-4"
                    >
                      View {nameB}
                    </Link>
                    <form action={dismissDuplicateAction.bind(null, candidate.id)}>
                      <button
                        type="submit"
                        className="text-accent hover:text-accent hover:underline underline-offset-4"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                  {canMerge ? (
                    <div className="mt-4">
                      <MergeCustomersForm
                        survivingCustomerId={candidate.customerAId}
                        mergedAwayCustomerId={candidate.customerBId}
                        duplicateCandidateId={candidate.id}
                        customers={customerOptions}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </section>
    </PageSection>
  );
}

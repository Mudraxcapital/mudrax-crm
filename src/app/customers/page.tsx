import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { countCustomers, listCustomers } from "@/modules/customers";
import { CustomerForm } from "@/modules/customers/presentation/components/CustomerForm";
import { createCustomerAction } from "@/modules/customers/presentation/controllers/createCustomer.action";
import { resolveCustomerListOptions } from "@/shared/auth/applyHierarchyListFilter";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { CreatePanel } from "../_components/CreatePanel";
import { CustomersTable } from "./_components/CustomersTable";

export default async function CustomersPage() {
  const { authContext } = await requirePermission("customer.view");
  const canCreate = hasPermission(authContext, "customer.create");
  const canViewDuplicates = hasPermission(authContext, "customer.duplicate.view");
  const listOptions = await resolveCustomerListOptions(authContext, { limit: 500 });

  const [customers, totalCount] = await Promise.all([
    listCustomers(authContext.organizationId, listOptions),
    countCustomers(authContext.organizationId, listOptions),
  ]);

  return (
    <PageSection>
      <PageHeader
        title="Customers"
        description={`Permanent identity records for every person contacted — independent of any single lead. ${totalCount.toLocaleString()} total.`}
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Customers" }]}
        actions={
          <>
            {canViewDuplicates ? (
              <Link href="/customers/duplicates">
                <Button variant="secondary">Duplicates</Button>
              </Link>
            ) : null}
            {canCreate ? (
              <CreatePanel
                triggerLabel="New customer"
                title="Create customer"
                description="Provide a name and at least one unique identifier."
                width="lg"
              >
                <CustomerForm action={createCustomerAction} />
              </CreatePanel>
            ) : null}
          </>
        }
      />

      <CustomersTable
        rows={customers.map((customer) => ({
          id: customer.id,
          fullName: customer.fullName,
          identityConfidence: customer.identityConfidence,
          status: customer.status,
        }))}
      />
    </PageSection>
  );
}

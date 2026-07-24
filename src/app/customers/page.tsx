import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCustomers } from "@/modules/customers";
import { CustomerForm } from "@/modules/customers/presentation/components/CustomerForm";
import { createCustomerAction } from "@/modules/customers/presentation/controllers/createCustomer.action";

export default async function CustomersPage() {
  const { authContext } = await requirePermission("customer.view");
  const canCreate = hasPermission(authContext, "customer.create");

  const customers = await listCustomers(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Customers</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          The permanent identity record of every person contacted, independent of any single Lead.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Identity Confidence</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">
                  No Customers yet.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{customer.fullName}</td>
                  <td className="px-4 py-3">{customer.identityConfidence}</td>
                  <td className="px-4 py-3">{customer.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {canCreate ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Create Customer</h2>
          <div className="mt-4">
            <CustomerForm action={createCustomerAction} />
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/leads" className="underline underline-offset-4">
          Leads →
        </Link>
        <Link href="/crm" className="underline underline-offset-4">
          CRM Dashboard →
        </Link>
      </nav>
    </div>
  );
}

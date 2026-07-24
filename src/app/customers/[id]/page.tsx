import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { CustomerNotFoundError, getCustomer } from "@/modules/customers";
import { listLeadsByCustomer } from "@/modules/leads";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { authContext } = await requirePermission("customer.view");
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      notFound();
    }
    throw error;
  }

  const leads = await listLeadsByCustomer(id);
  const canUpdate = hasPermission(authContext, "customer.update");

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/customers" className="text-sm underline underline-offset-4">
        ← Back to Customers
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{customer.fullName}</h1>
          <p className="text-foreground/60 mt-1 text-sm">
            {customer.identityConfidence} · {customer.status}
          </p>
        </div>
        {canUpdate ? (
          <Link
            href={`/customers/${customer.id}/edit`}
            className="text-sm underline underline-offset-4"
          >
            Edit
          </Link>
        ) : null}
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Identifiers</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          {customer.identifiers.length === 0 ? (
            <p className="text-foreground/60 col-span-2">No identifiers on file.</p>
          ) : (
            customer.identifiers.map((identifier) => (
              <div key={identifier.id} className="col-span-2 grid grid-cols-2">
                <dt className="text-foreground/60">{identifier.type}</dt>
                <dd className="font-mono text-xs">{identifier.valueMasked}</dd>
              </div>
            ))
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Leads ({leads.length})</h2>
        </div>
        <table className="w-full text-left text-sm">
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td className="text-foreground/60 px-4 py-6 text-center">No Leads yet.</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{lead.fullNameSnapshot}</td>
                  <td className="px-4 py-3">{lead.currentStageName}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/leads/${lead.id}`}
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
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { listCustomers } from "@/modules/customers";
import { leadCatalogs, listLeads } from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { LeadForm } from "@/modules/leads/presentation/components/LeadForm";
import { createLeadAction } from "@/modules/leads/presentation/controllers/createLead.action";

export default async function LeadsPage() {
  const { session, authContext } = await requirePermission("lead.view");
  const canCreate = hasPermission(authContext, "lead.create");

  const scope = getPermissionScope(authContext, "lead.view");
  const filter = scope === "SELF" ? { assignedToUserIds: [session.user.id] } : undefined;

  const [leads, customers, sources, assignees] = await Promise.all([
    listLeads(authContext.organizationId, filter),
    listCustomers(authContext.organizationId),
    leadCatalogs.listSources(authContext.organizationId),
    listUserSummaries(authContext.organizationId),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Leads</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Inbound sales inquiries against an existing Customer, tracked through the pipeline.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">
                  No Leads yet.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{lead.fullNameSnapshot}</td>
                  <td className="px-4 py-3">{lead.currentStageName}</td>
                  <td className="px-4 py-3">{lead.leadSourceName}</td>
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

      {canCreate ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Create Lead</h2>
          <div className="mt-4">
            <LeadForm
              action={createLeadAction}
              customers={customers.map((customer) => ({
                id: customer.id,
                fullName: customer.fullName,
              }))}
              sources={sources}
              assignees={assignees.map((user) => ({ id: user.id, fullName: user.fullName }))}
            />
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/customers" className="underline underline-offset-4">
          Customers →
        </Link>
        <Link href="/crm" className="underline underline-offset-4">
          CRM Dashboard →
        </Link>
      </nav>
    </div>
  );
}

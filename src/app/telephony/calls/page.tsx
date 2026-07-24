import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { listLeads } from "@/modules/leads";
import { listCustomers } from "@/modules/customers";
import { listUserSummaries } from "@/modules/users";
import { listCallAttempts } from "@/modules/telephony";
import { ClickToCallForm } from "@/modules/telephony/presentation/components/ClickToCallForm";
import { initiateClickToCallAction } from "@/modules/telephony/presentation/controllers/initiateClickToCall.action";

export default async function TelephonyCallsPage() {
  const { session, authContext } = await requirePermission("call.view");
  const canInitiate = hasPermission(authContext, "call.initiate");

  const scope = getPermissionScope(authContext, "call.view");
  const filter = scope === "SELF" ? { agentUserId: session.user.id } : undefined;

  const [calls, leads, customers, assignees] = await Promise.all([
    listCallAttempts(authContext.organizationId, filter),
    listLeads(authContext.organizationId),
    listCustomers(authContext.organizationId),
    listUserSummaries(authContext.organizationId),
  ]);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/telephony" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Telephony Dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calls</h1>
        <p className="text-muted mt-1 text-sm">Call Logs and Call History.</p>
      </div>

      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Direction</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
              <th className="px-4 py-3 font-medium">Initiated</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted px-4 py-6 text-center">
                  No Calls yet.
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr
                  key={call.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">{call.direction}</td>
                  <td className="px-4 py-3">{call.status}</td>
                  <td className="px-4 py-3">{call.callOutcomeName ?? "—"}</td>
                  <td className="px-4 py-3">{new Date(call.initiatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/telephony/calls/${call.id}`}
                      className="text-sm text-accent hover:text-accent hover:underline underline-offset-4"
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

      {canInitiate ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Click to Call</h2>
          <div className="mt-4">
            <ClickToCallForm
              action={initiateClickToCallAction}
              leads={leads.map((lead) => ({ id: lead.id, label: lead.fullNameSnapshot }))}
              customers={customers.map((customer) => ({
                id: customer.id,
                label: customer.fullName,
              }))}
              assignees={assignees.map((user) => ({ id: user.id, fullName: user.fullName }))}
            />
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/telephony/missed-calls" className="text-accent hover:text-accent hover:underline underline-offset-4">
          Missed Calls →
        </Link>
      </nav>
    </div>
  );
}

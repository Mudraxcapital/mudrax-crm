import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { listLeads } from "@/modules/leads";
import { listCustomers } from "@/modules/customers";
import { listUserSummaries } from "@/modules/users";
import { listCallAttempts } from "@/modules/telephony";
import { ClickToCallForm } from "@/modules/telephony/presentation/components/ClickToCallForm";
import { initiateClickToCallAction } from "@/modules/telephony/presentation/controllers/initiateClickToCall.action";
import { agentHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";
import { nameFromMap } from "@/shared/ui/displayName";
import { TabNav } from "@/shared/ui/Tabs";
import { telephonyTabItems } from "../_lib/telephonyTabs";

export default async function TelephonyCallsPage() {
  const { authContext } = await requirePermission("call.view");
  const canInitiate = hasPermission(authContext, "call.initiate");
  const callerWorkspace = isCallerWorkspaceUser(authContext);
  const filter = agentHierarchyFilter(authContext);

  const [calls, leads, customers, assignees] = await Promise.all([
    listCallAttempts(authContext.organizationId, { ...filter, limit: 200 }),
    callerWorkspace
      ? listLeads(authContext.organizationId, {
          assignedToUserIds: [authContext.userId],
          limit: 500,
        })
      : listLeads(authContext.organizationId, { limit: 500 }),
    canInitiate && !callerWorkspace
      ? listCustomers(authContext.organizationId, { limit: 500 })
      : Promise.resolve([]),
    !callerWorkspace
      ? listUserSummaries(authContext.organizationId)
      : Promise.resolve([]),
  ]);

  const leadNameById = new Map(leads.map((lead) => [lead.id, lead.fullNameSnapshot]));
  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.fullName]));
  const agentNameById = new Map(assignees.map((user) => [user.id, user.fullName]));

  return (
    <div className="mx-page flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {callerWorkspace ? "My Calls" : "Calls"}
        </h1>
        <p className="text-muted mt-1 text-sm">
          {callerWorkspace ? "Your call logs and history." : "Call Logs and Call History."}
        </p>
      </div>

      <TabNav activeHref="/telephony/calls" items={telephonyTabItems(authContext)} />

      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Contact</th>
              {!callerWorkspace ? <th className="px-4 py-3 font-medium">Agent</th> : null}
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
                <td colSpan={callerWorkspace ? 6 : 7} className="text-muted px-4 py-6 text-center">
                  No Calls yet.
                </td>
              </tr>
            ) : (
              calls.map((call) => {
                const contact =
                  (call.leadId && nameFromMap(leadNameById, call.leadId, "")) ||
                  (call.customerId && nameFromMap(customerNameById, call.customerId, "")) ||
                  "—";
                return (
                  <tr
                    key={call.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{contact}</td>
                    {!callerWorkspace ? (
                      <td className="px-4 py-3">
                        {call.agentUserId
                          ? nameFromMap(agentNameById, call.agentUserId)
                          : "—"}
                      </td>
                    ) : null}
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
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {canInitiate && !callerWorkspace ? (
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
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { CustomerNotFoundError, getCustomer, listCustomers } from "@/modules/customers";
import { listActiveLeadFields, listLeadsByCustomer } from "@/modules/leads";
import { listLoanApplications } from "@/modules/loan-applications";
import { listDocumentsByCustomer } from "@/modules/documents";
import { listCallHistoryByCustomer } from "@/modules/telephony";
import { listNotifications } from "@/modules/notifications";
import { listFollowUps } from "@/modules/follow-ups";
import { listCustomerTimeline } from "@/modules/activity-timeline";
import { MergeCustomersForm } from "@/modules/customers/presentation/components/MergeCustomersForm";
import { canAccessCustomer } from "@/shared/auth/assertCanAccessCustomer";
import { resolveCustomerListOptions } from "@/shared/auth/applyHierarchyListFilter";

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

  if (!(await canAccessCustomer(authContext, customer))) {
    notFound();
  }

  // Permanent tombstone redirect — merged-away IDs always resolve to the survivor.
  if (customer.mergedIntoCustomerId) {
    redirect(`/customers/${customer.mergedIntoCustomerId}`);
  }

  const canUpdate = hasPermission(authContext, "customer.update");
  const canMerge = hasPermission(authContext, "customer.merge");
  const canViewDuplicates =
    hasPermission(authContext, "customer.duplicate.view") ||
    hasPermission(authContext, "customer.merge");
  const canViewLoans = hasPermission(authContext, "loan_application.view");
  const canViewDocs = hasPermission(authContext, "document.view");
  const canViewCalls = hasPermission(authContext, "call.view");
  const canViewNotifications = hasPermission(authContext, "notification.view");
  const canViewFollowUps = hasPermission(authContext, "follow_up.view");

  const listOptions = await resolveCustomerListOptions(authContext);
  const leads = await listLeadsByCustomer(id);
  const leadIds = leads.map((lead) => lead.id);

  const [
    loanApps,
    documents,
    calls,
    notifications,
    followUps,
    timeline,
    leadFields,
    allCustomers,
  ] = await Promise.all([
    canViewLoans
      ? listLoanApplications(authContext.organizationId, { customerId: id, limit: 50 })
      : Promise.resolve([]),
    canViewDocs ? listDocumentsByCustomer(id) : Promise.resolve([]),
    canViewCalls ? listCallHistoryByCustomer(id) : Promise.resolve([]),
    canViewNotifications
      ? listNotifications(authContext.organizationId, {
          recipientType: "CUSTOMER",
          recipientId: id,
          limit: 50,
        })
      : Promise.resolve([]),
    canViewFollowUps && leadIds.length > 0
      ? listFollowUps(authContext.organizationId, { leadIds, limit: 500 })
      : Promise.resolve([]),
    listCustomerTimeline(id, authContext.organizationId, 40),
    listActiveLeadFields(authContext.organizationId),
    canMerge ? listCustomers(authContext.organizationId, listOptions) : Promise.resolve([]),
  ]);
  const visibleLeadFieldKeys = new Set(
    leadFields
      .filter((field) => field.isVisible && field.section !== "hidden")
      .map((field) => field.internalKey),
  );

  return (
    <div className="mx-page flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <nav aria-label="Breadcrumb" className="text-muted flex flex-wrap items-center gap-1.5 text-xs">
            <Link href="/crm" className="hover:text-foreground">
              CRM
            </Link>
            <span>/</span>
            <Link href="/customers" className="hover:text-foreground">
              Customers
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{customer.fullName}</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.fullName}</h1>
          <p className="text-muted text-sm">
            {customer.identityConfidence} · {customer.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewDuplicates ? (
            <Link href="/customers/duplicates" className="mx-btn mx-btn-secondary mx-btn-sm">
              Duplicates
            </Link>
          ) : null}
          {canUpdate && customer.status === "ACTIVE" ? (
            <Link href={`/customers/${customer.id}/edit`} className="mx-btn mx-btn-primary mx-btn-sm">
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Customer Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Date of birth</dt>
          <dd>{customer.dob ?? "—"}</dd>
          <dt className="text-muted">Created</dt>
          <dd>{new Date(customer.createdAt).toLocaleString()}</dd>
          {customer.identifiers.length === 0 ? (
            <p className="text-muted col-span-2">No identifiers on file.</p>
          ) : (
            customer.identifiers.map((identifier) => (
              <div key={identifier.id} className="col-span-2 grid grid-cols-2">
                <dt className="text-muted">{identifier.type}</dt>
                <dd className="font-mono text-xs">{identifier.valueMasked}</dd>
              </div>
            ))
          )}
        </dl>
      </section>

      <ProfileSection title={`Leads (${leads.length})`}>
        {leads.length === 0 ? (
          <Empty>No Leads yet.</Empty>
        ) : (
          leads.map((lead) => {
            const extras = (lead.fieldValues ?? [])
              .filter(
                (value) =>
                  visibleLeadFieldKeys.has(value.internalKey) &&
                  !["full_name", "phone", "email"].includes(value.internalKey) &&
                  value.displayValue,
              )
              .slice(0, 3)
              .map((value) => value.displayValue)
              .join(" · ");
            return (
              <Row
                key={lead.id}
                href={`/leads/${lead.id}`}
                primary={lead.fullNameSnapshot}
                secondary={[lead.currentStageName, lead.phoneSnapshot, extras]
                  .filter(Boolean)
                  .join(" · ")}
              />
            );
          })
        )}
      </ProfileSection>

      {canViewLoans ? (
        <ProfileSection title={`Loan Applications (${loanApps.length})`}>
          {loanApps.length === 0 ? (
            <Empty>No loan applications.</Empty>
          ) : (
            loanApps.map((app) => (
              <Row
                key={app.id}
                href={`/loan-applications/${app.id}`}
                primary={`₹${app.requestedAmount}`}
                secondary={app.applicationStatusName ?? app.applicationStatusBucket ?? "—"}
              />
            ))
          )}
        </ProfileSection>
      ) : null}

      {canViewDocs ? (
        <ProfileSection title={`Documents (${documents.length})`}>
          {documents.length === 0 ? (
            <Empty>No documents.</Empty>
          ) : (
            documents.map((doc) => (
              <Row
                key={doc.id}
                href={`/documents/${doc.id}`}
                primary={doc.documentTypeName ?? "Document"}
                secondary={doc.status}
              />
            ))
          )}
        </ProfileSection>
      ) : null}

      {canViewCalls ? (
        <ProfileSection title={`Calls (${calls.length})`}>
          {calls.length === 0 ? (
            <Empty>No calls.</Empty>
          ) : (
            calls.map((call) => (
              <Row
                key={call.id}
                href={`/telephony/calls/${call.id}`}
                primary={`${call.direction} · ${call.status}`}
                secondary={new Date(call.initiatedAt).toLocaleString()}
              />
            ))
          )}
        </ProfileSection>
      ) : null}

      {canViewNotifications ? (
        <ProfileSection title={`Notifications (${notifications.length})`}>
          {notifications.length === 0 ? (
            <Empty>No notifications.</Empty>
          ) : (
            notifications.map((notification) => (
              <Row
                key={notification.id}
                href={`/notifications/${notification.id}`}
                primary={notification.category}
                secondary={notification.status}
              />
            ))
          )}
        </ProfileSection>
      ) : null}

      {canViewFollowUps ? (
        <ProfileSection title={`Follow-ups (${followUps.length})`}>
          {followUps.length === 0 ? (
            <Empty>No follow-ups.</Empty>
          ) : (
            followUps.map((followUp) => (
              <Row
                key={followUp.id}
                href={`/leads/${followUp.leadId}`}
                primary={`${followUp.triggerType} · ${followUp.status}`}
                secondary={new Date(followUp.scheduledFor).toLocaleString()}
              />
            ))
          )}
        </ProfileSection>
      ) : null}

      <ProfileSection title="Timeline">
        {timeline.length === 0 ? (
          <Empty>No timeline activity.</Empty>
        ) : (
          timeline.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 text-sm last:border-0 "
            >
              <span>
                <span className="text-muted-foreground mr-2 text-xs">{entry.source}</span>
                {entry.label}
              </span>
              <span className="text-muted whitespace-nowrap text-xs">
                {entry.occurredAt.toLocaleString()}
              </span>
            </li>
          ))
        )}
      </ProfileSection>

      {canMerge && customer.status === "ACTIVE" ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Merge into this Customer</h2>
          <p className="text-muted mt-1 text-xs">
            Choose the duplicate customer to merge away (audited, irreversible). Surviving record:{" "}
            <span className="text-foreground font-medium">{customer.fullName}</span>
          </p>
          <div className="mt-4">
            <MergeCustomersForm
              survivingCustomerId={customer.id}
              survivingLabel={customer.fullName}
              customers={allCustomers
                .filter((item) => item.id !== customer.id)
                .map((item) => ({ id: item.id, fullName: item.fullName }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 ">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <li className="text-muted px-4 py-6 text-center text-sm">{children}</li>;
}

function Row({
  href,
  primary,
  secondary,
}: {
  href: string;
  primary: string;
  secondary: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 text-sm last:border-0 ">
      <Link href={href} className="text-accent hover:underline underline-offset-4">
        {primary}
      </Link>
      <span className="text-muted">{secondary}</span>
    </li>
  );
}

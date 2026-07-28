import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission, isCallerWorkspaceUser, isInternalStaff } from "@/modules/rbac";
import { globalSearch } from "@/app/_lib/globalSearch";
import {
  managerBookFilter,
  resolveCustomerListOptions,
  visibleLeadsFilter,
} from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  // Customers / non-staff identities must not search the internal CRM.
  if (!isInternalStaff(current.authContext)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ data: [] });
  }

  const callerOnly = isCallerWorkspaceUser(current.authContext);
  const customerOptions = await resolveCustomerListOptions(current.authContext, {
    search: q,
    limit: 50,
  });
  const leadFilter = visibleLeadsFilter(current.authContext, {
    permissionCode: "lead.view",
    actorUserId: current.session.user.id,
  });
  const campaignBook = managerBookFilter(current.authContext);

  const hits = await globalSearch(current.authContext.organizationId, q, {
    includeCustomers: !callerOnly && hasPermission(current.authContext, "customer.view"),
    includeLeads: hasPermission(current.authContext, "lead.view"),
    includeCampaigns: !callerOnly && hasPermission(current.authContext, "campaign.view"),
    includeDocuments: !callerOnly && hasPermission(current.authContext, "document.view"),
    includeLoanApplications:
      !callerOnly && hasPermission(current.authContext, "loan_application.view"),
    assignedToUserId: callerOnly ? current.session.user.id : undefined,
    leadHrefPrefix: callerOnly ? "/caller/leads" : "/leads",
    customerListOptions: customerOptions,
    leadListFilter: leadFilter,
    campaignListFilter: campaignBook,
    authContext: current.authContext,
    limit: 25,
  });

  return NextResponse.json({ data: hits });
}

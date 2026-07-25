import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser, isInternalStaff } from "@/modules/rbac";
import { globalSearch } from "@/app/_lib/globalSearch";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const hits = await globalSearch(current.authContext.organizationId, q, {
    includeCustomers: !callerOnly && hasPermission(current.authContext, "customer.view"),
    includeLeads: hasPermission(current.authContext, "lead.view"),
    includeCampaigns: !callerOnly && hasPermission(current.authContext, "campaign.view"),
    includeDocuments: !callerOnly && hasPermission(current.authContext, "document.view"),
    includeLoanApplications:
      !callerOnly && hasPermission(current.authContext, "loan_application.view"),
    assignedToUserId: callerOnly ? current.session.user.id : undefined,
    leadHrefPrefix: callerOnly ? "/caller/leads" : "/leads",
    limit: 25,
  });

  return NextResponse.json({ data: hits });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { globalSearch } from "@/app/_lib/globalSearch";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ data: [] });
  }

  const hits = await globalSearch(current.authContext.organizationId, q, {
    includeCustomers: hasPermission(current.authContext, "customer.view"),
    includeLeads: hasPermission(current.authContext, "lead.view"),
    includeCampaigns: hasPermission(current.authContext, "campaign.view"),
    includeDocuments: hasPermission(current.authContext, "document.view"),
    includeLoanApplications: hasPermission(current.authContext, "loan_application.view"),
    limit: 25,
  });

  return NextResponse.json({ data: hits });
}

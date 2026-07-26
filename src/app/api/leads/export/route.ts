// ============================================================================
// src/app/api/leads/export/route.ts
//
// Bulk Export (CSV) — requires `lead.view`. Hierarchy-scoped to match All Leads.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { exportLeadsCsv, listActiveLeadFields } from "@/modules/leads";
import { visibleLeadsFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Callers never export the org lead book — use My Leads workspace instead.
  if (isCallerWorkspaceUser(current.authContext)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const currentStageId = url.searchParams.get("currentStageId") || undefined;
  const leadSourceId = url.searchParams.get("leadSourceId") || undefined;
  const campaignId = url.searchParams.get("campaignId") || undefined;
  const assignedToUserId = url.searchParams.get("assignedToUserId") || undefined;
  const priority = url.searchParams.get("priority") || undefined;

  const activeFields = await listActiveLeadFields(current.authContext.organizationId);
  const searchableKeys = activeFields
    .filter((field) => field.isSearchable)
    .map((field) => field.internalKey)
    .filter((key) => key !== "full_name" && key !== "phone" && key !== "email");

  const fieldFilters: Record<string, string> = {};
  for (const field of activeFields.filter((item) => item.isFilterable)) {
    const raw = url.searchParams.get(`ff_${field.internalKey}`);
    if (raw && raw.trim()) {
      fieldFilters[field.internalKey] = raw.trim();
    }
  }
  if (priority && !fieldFilters.priority) {
    fieldFilters.priority = priority;
  }

  const hierarchy = visibleLeadsFilter(current.authContext, {
    permissionCode: "lead.view",
    actorUserId: current.session.user.id,
    assignedToUserId,
  });

  const filter = {
    search,
    currentStageId,
    leadSourceId,
    campaignId,
    ...hierarchy,
    fieldFilters: Object.keys(fieldFilters).length > 0 ? fieldFilters : undefined,
    searchableCustomKeys: searchableKeys,
  };

  const file = await exportLeadsCsv(current.authContext.organizationId, filter);
  return new NextResponse(file.body, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
    },
  });
}

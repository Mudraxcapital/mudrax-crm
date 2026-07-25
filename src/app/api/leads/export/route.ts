// ============================================================================
// src/app/api/leads/export/route.ts
//
// Bulk Export (CSV) — requires `lead.view`.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { getPermissionScope, hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { exportLeadsCsv } from "@/modules/leads";

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
  const scope = getPermissionScope(current.authContext, "lead.view");
  const filter = {
    search: url.searchParams.get("search") || undefined,
    currentStageId: url.searchParams.get("currentStageId") || undefined,
    leadSourceId: url.searchParams.get("leadSourceId") || undefined,
    assignedToUserIds:
      scope === "SELF"
        ? [current.session.user.id]
        : url.searchParams.get("assignedToUserId")
          ? [url.searchParams.get("assignedToUserId")!]
          : undefined,
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

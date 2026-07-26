import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { getKanbanBoard } from "@/modules/leads";
import { leadHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = getPermissionScope(current.authContext, "lead.view");
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const hierarchyFilter = leadHierarchyFilter(current.authContext);

  const filter = {
    ...hierarchyFilter,
    ...(scope === "SELF" ? { assignedToUserIds: [current.session.user.id] } : {}),
    ...(campaignId && campaignId.toLowerCase() !== "all" ? { campaignId } : {}),
  };

  const board = await getKanbanBoard(current.authContext.organizationId, filter);
  return NextResponse.json({ data: board, campaignId: campaignId ?? null });
}

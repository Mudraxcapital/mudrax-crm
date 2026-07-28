import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { getKanbanBoard } from "@/modules/leads";
import { visibleLeadsFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const hierarchyFilter = visibleLeadsFilter(current.authContext, {
    permissionCode: "lead.view",
    actorUserId: current.session.user.id,
  });

  const filter = {
    ...hierarchyFilter,
    ...(campaignId && campaignId.toLowerCase() !== "all" ? { campaignId } : {}),
  };

  const board = await getKanbanBoard(current.authContext.organizationId, filter);
  return NextResponse.json({ data: board, campaignId: campaignId ?? null });
}

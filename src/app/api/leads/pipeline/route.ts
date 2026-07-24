import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { getKanbanBoard } from "@/modules/leads";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = getPermissionScope(current.authContext, "lead.view");
  const filter = scope === "SELF" ? { assignedToUserIds: [current.session.user.id] } : undefined;
  const board = await getKanbanBoard(current.authContext.organizationId, filter);
  return NextResponse.json({ data: board });
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  createDashboard,
  createDashboardSchema,
  KpiNotFoundError,
  listDashboards,
} from "@/modules/reports";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dashboards = await listDashboards(current.authContext.organizationId);
  return NextResponse.json({ data: dashboards });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "dashboard.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDashboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const dashboard = await createDashboard({
      organizationId: current.authContext.organizationId,
      ownerUserId: current.session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: dashboard }, { status: 201 });
  } catch (error) {
    if (error instanceof KpiNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

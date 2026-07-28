import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { callerLeaderboardQuerySchema, getCallerLeaderboard } from "@/modules/reports";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = callerLeaderboardQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid filters." },
      { status: 400 },
    );
  }

  const data = await getCallerLeaderboard(
    current.authContext.organizationId,
    parsed.data,
    new Date(),
    { visibleUserIds: current.authContext.hierarchy.visibleUserIds },
  );
  return NextResponse.json({ data });
}

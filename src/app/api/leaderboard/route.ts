// ============================================================================
// Mobile / API mirror of /leaderboard — same auth + loadLeaderboardDashboard composition.
// Additive; does not change the web Leaderboard page.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { loadLeaderboardDashboard } from "@/app/leaderboard/_lib/loadLeaderboardDashboard";
import { parseLeaderboardQuery } from "@/app/leaderboard/_lib/parseLeaderboardQuery";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  const isCallerOnly = isCallerWorkspaceUser(current.authContext);

  if (!isCallerOnly && !hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const query = parseLeaderboardQuery(raw);

  const data = await loadLeaderboardDashboard({
    authContext: current.authContext,
    query,
    isCallerOnly,
  });

  return NextResponse.json({ data });
}

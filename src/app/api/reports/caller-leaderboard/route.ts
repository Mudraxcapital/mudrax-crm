import { NextResponse } from "next/server";
import { requirePermission } from "@/infra/auth/session";
import { callerLeaderboardQuerySchema, getCallerLeaderboard } from "@/modules/reports";

export async function GET(request: Request) {
  const { authContext } = await requirePermission("report.view");
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = callerLeaderboardQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid filters." },
      { status: 400 },
    );
  }

  const data = await getCallerLeaderboard(authContext.organizationId, parsed.data);
  return NextResponse.json({ data });
}

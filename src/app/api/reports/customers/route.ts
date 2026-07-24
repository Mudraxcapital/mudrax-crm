import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { runReport, runReportSchema } from "@/modules/reports";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = runReportSchema.safeParse({ ...body, reportType: "CUSTOMER" });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const execution = await runReport({
    organizationId: current.authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: current.session.user.id },
  });
  return NextResponse.json({ data: execution }, { status: 201 });
}

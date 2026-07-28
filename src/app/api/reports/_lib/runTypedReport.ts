import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { runReport, runReportSchema } from "@/modules/reports";
import { mergeReportHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

async function runTypedReport(request: Request, reportType: string) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = runReportSchema.safeParse({ ...body, reportType });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const execution = await runReport({
    organizationId: current.authContext.organizationId,
    input: {
      ...parsed.data,
      filter: mergeReportHierarchyFilter(current.authContext, parsed.data.filter),
    },
    actor: { actorType: "USER", actorId: current.session.user.id },
  });
  return NextResponse.json({ data: execution }, { status: 201 });
}

export { runTypedReport };

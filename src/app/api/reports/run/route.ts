import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
  runReport,
  runReportSchema,
} from "@/modules/reports";
import { mergeReportHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = runReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const execution = await runReport({
      organizationId: current.authContext.organizationId,
      input: {
        ...parsed.data,
        filter: mergeReportHierarchyFilter(current.authContext, parsed.data.filter),
      },
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: execution }, { status: 201 });
  } catch (error) {
    if (
      error instanceof ReportTemplateNotFoundError ||
      error instanceof ReportTemplateNotPublishedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

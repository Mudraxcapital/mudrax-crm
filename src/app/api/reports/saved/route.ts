import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  listSavedReports,
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
  saveReport,
  saveReportSchema,
} from "@/modules/reports";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "report.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const saved = await listSavedReports(current.session.user.id);
  return NextResponse.json({ data: saved });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "report.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const saved = await saveReport({
      organizationId: current.authContext.organizationId,
      ownerUserId: current.session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: saved }, { status: 201 });
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

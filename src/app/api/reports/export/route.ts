import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  exportReport,
  exportReportSchema,
  ReportExecutionNotCompletedError,
  ReportExecutionNotFoundError,
  UnsupportedExportFormatError,
} from "@/modules/reports";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "export.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = exportReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const rendered = await exportReport({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json(
      {
        data: {
          job: rendered.job,
          fileName: rendered.fileName,
          contentType: rendered.contentType,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof ReportExecutionNotFoundError ||
      error instanceof ReportExecutionNotCompletedError ||
      error instanceof UnsupportedExportFormatError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

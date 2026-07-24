import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  deleteSavedReport,
  getSavedReport,
  rerunSavedReport,
  SavedReportNotFoundError,
} from "@/modules/reports";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "report.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const saved = await getSavedReport(current.session.user.id, id);
  if (!saved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: saved });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "report.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    await deleteSavedReport({
      organizationId: current.authContext.organizationId,
      ownerUserId: current.session.user.id,
      savedReportId: id,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof SavedReportNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (body?.action !== "rerun") {
    return NextResponse.json({ error: 'Expected action "rerun".' }, { status: 400 });
  }

  try {
    const execution = await rerunSavedReport({
      organizationId: current.authContext.organizationId,
      ownerUserId: current.session.user.id,
      savedReportId: id,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: execution }, { status: 201 });
  } catch (error) {
    if (error instanceof SavedReportNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

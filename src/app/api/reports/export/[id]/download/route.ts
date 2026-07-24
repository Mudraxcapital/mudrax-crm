import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { downloadExport, ExportJobNotFoundError } from "@/modules/reports";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "export.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const rendered = await downloadExport({
      organizationId: current.authContext.organizationId,
      exportJobId: id,
    });
    return new NextResponse(new Uint8Array(rendered.body), {
      status: 200,
      headers: {
        "Content-Type": rendered.contentType,
        "Content-Disposition": `attachment; filename="${rendered.fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof ExportJobNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

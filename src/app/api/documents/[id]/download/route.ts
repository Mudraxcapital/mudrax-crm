// ============================================================================
// src/app/api/documents/[id]/download/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AttachmentNotFoundError,
  DocumentNotFoundError,
  DocumentVersionNotFoundError,
  downloadDocument,
  getDocument,
} from "@/modules/documents";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "document.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const document = await getDocument(id);
    if (document.organizationId !== current.authContext.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const file = await downloadDocument(id);
    return new NextResponse(new Uint8Array(file.content), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
        "X-Document-Version": String(file.versionNumber),
      },
    });
  } catch (error) {
    if (
      error instanceof DocumentNotFoundError ||
      error instanceof DocumentVersionNotFoundError ||
      error instanceof AttachmentNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

// ============================================================================
// src/app/api/documents/[id]/preview/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AttachmentNotFoundError,
  DocumentNotFoundError,
  DocumentVersionNotFoundError,
  getDocument,
  getDocumentPreview,
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
    const preview = await getDocumentPreview(id);
    return NextResponse.json({ data: preview });
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

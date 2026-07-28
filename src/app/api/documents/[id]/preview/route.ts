// ============================================================================
// src/app/api/documents/[id]/preview/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  AttachmentNotFoundError,
  DocumentNotFoundError,
  DocumentVersionNotFoundError,
  getDocument,
  getDocumentPreview,
} from "@/modules/documents";

export async function GET(request: Request,
  context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
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

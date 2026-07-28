// ============================================================================
// src/app/api/documents/types/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  createDocumentType,
  createDocumentTypeSchema,
  DocumentCategoryNotFoundError,
  DuplicateDocumentTypeNameError,
  listDocumentTypes,
} from "@/modules/documents";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "document.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const documentCategoryId = url.searchParams.get("documentCategoryId") ?? undefined;

  const types = await listDocumentTypes(current.authContext.organizationId, {
    documentCategoryId,
  });
  return NextResponse.json({ data: types });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "document.category.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDocumentTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const documentType = await createDocumentType({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: documentType }, { status: 201 });
  } catch (error) {
    if (
      error instanceof DuplicateDocumentTypeNameError ||
      error instanceof DocumentCategoryNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

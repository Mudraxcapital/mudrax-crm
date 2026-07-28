// ============================================================================
// src/app/api/documents/[id]/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  DocumentNotFoundError,
  getDocument,
  InvalidDocumentTypeReferenceError,
  updateDocumentMetadata,
  updateDocumentMetadataSchema,
} from "@/modules/documents";
import {
  filterDocumentsByOwnerVisibility,
  resolveVisibleOwnerIds,
} from "@/shared/auth/applyHierarchyListFilter";

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
    const visibility = await resolveVisibleOwnerIds(current.authContext);
    if (filterDocumentsByOwnerVisibility([document], visibility).length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: document });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "document.upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateDocumentMetadataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const existing = await getDocument(id);
    if (existing.organizationId !== current.authContext.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const visibility = await resolveVisibleOwnerIds(current.authContext);
    if (filterDocumentsByOwnerVisibility([existing], visibility).length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const document = await updateDocumentMetadata({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: document });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidDocumentTypeReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

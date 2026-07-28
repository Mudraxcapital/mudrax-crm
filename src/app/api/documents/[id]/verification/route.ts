// ============================================================================
// src/app/api/documents/[id]/verification/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  DocumentNotFoundError,
  DocumentVerificationNotFoundError,
  DocumentVersionNotFoundError,
  getCurrentDocumentVerification,
  getDocument,
  InvalidVerificationTransitionError,
  updateVerificationStatus,
  updateVerificationStatusSchema,
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
    const verification = await getCurrentDocumentVerification(id);
    return NextResponse.json({ data: verification });
  } catch (error) {
    if (
      error instanceof DocumentNotFoundError ||
      error instanceof DocumentVersionNotFoundError ||
      error instanceof DocumentVerificationNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "document.verify")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateVerificationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const document = await getDocument(id);
    if (document.organizationId !== current.authContext.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentVerification = await getCurrentDocumentVerification(id);
    const verification = await updateVerificationStatus({
      id: currentVerification.id,
      userId: current.session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: verification });
  } catch (error) {
    if (
      error instanceof DocumentNotFoundError ||
      error instanceof DocumentVerificationNotFoundError ||
      error instanceof DocumentVersionNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidVerificationTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

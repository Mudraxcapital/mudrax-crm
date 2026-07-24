// ============================================================================
// src/app/api/documents/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  InvalidCustomerReferenceError,
  InvalidDocumentOwnerError,
  InvalidDocumentTypeReferenceError,
  InvalidLeadReferenceError,
  listDocuments,
  MissingDocumentOwnerError,
  uploadDocument,
  uploadDocumentSchema,
} from "@/modules/documents";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "document.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const ownerType = url.searchParams.get("ownerType") ?? undefined;
  const ownerId = url.searchParams.get("ownerId") ?? undefined;

  const documents = await listDocuments(current.authContext.organizationId, {
    ownerType: ownerType as "CUSTOMER" | "LEAD" | undefined,
    ownerId: ownerId ?? undefined,
  });
  return NextResponse.json({ data: documents });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "document.upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const document = await uploadDocument({
      organizationId: current.authContext.organizationId,
      userId: current.session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidDocumentTypeReferenceError ||
      error instanceof InvalidDocumentOwnerError ||
      error instanceof MissingDocumentOwnerError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

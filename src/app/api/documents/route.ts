// ============================================================================
// src/app/api/documents/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
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
import {
  filterDocumentsByOwnerVisibility,
  resolveVisibleOwnerIds,
} from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "document.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const ownerType = url.searchParams.get("ownerType") ?? undefined;
  const ownerId = url.searchParams.get("ownerId") ?? undefined;

  const visibility = await resolveVisibleOwnerIds(current.authContext);
  const documents = filterDocumentsByOwnerVisibility(
    await listDocuments(current.authContext.organizationId, {
      ownerType: ownerType as "CUSTOMER" | "LEAD" | undefined,
      ownerId: ownerId ?? undefined,
    }),
    visibility,
  );
  return NextResponse.json({ data: documents });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

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
    const visibility = await resolveVisibleOwnerIds(current.authContext);
    if (!visibility.unrestricted) {
      const allowed =
        parsed.data.ownerType === "CUSTOMER"
          ? visibility.customerIds?.has(parsed.data.ownerId)
          : visibility.leadIds?.has(parsed.data.ownerId);
      if (!allowed) {
        return NextResponse.json({ error: "Owner not found or access denied." }, { status: 404 });
      }
    }

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

// ============================================================================
// src/app/api/documents/categories/route.ts
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createDocumentCategory,
  createDocumentCategorySchema,
  DuplicateDocumentCategoryNameError,
  listDocumentCategories,
} from "@/modules/documents";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "document.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categories = await listDocumentCategories(current.authContext.organizationId);
  return NextResponse.json({ data: categories });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "document.category.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDocumentCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const category = await createDocumentCategory({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateDocumentCategoryNameError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

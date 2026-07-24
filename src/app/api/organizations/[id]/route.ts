// ============================================================================
// src/app/api/organizations/[id]/route.ts
//
// Organization API — GET (read one, requires `organization.view`) and PATCH
// (update, requires `organization.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  DuplicateOrganizationCodeError,
  OrganizationNotFoundError,
  getOrganization,
  updateOrganizationSchema,
  updateOrganization,
} from "@/modules/organization";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "organization.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const organization = await getOrganization(id);
    return NextResponse.json({ data: organization });
  } catch (error) {
    if (error instanceof OrganizationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "organization.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const organization = await updateOrganization({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: organization });
  } catch (error) {
    if (error instanceof OrganizationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DuplicateOrganizationCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

// ============================================================================
// src/app/api/organizations/route.ts
//
// Organization API — GET (list, requires `organization.view`) and POST
// (create, requires `organization.manage`). RBAC and Audit logging are
// enforced identically to the Server Action path: this Route Handler is a
// thin adapter over the same `@/modules/organization` use-cases.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createOrganization,
  createOrganizationSchema,
  DuplicateOrganizationCodeError,
  listOrganizations,
} from "@/modules/organization";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "organization.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizations = await listOrganizations();
  return NextResponse.json({ data: organizations });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "organization.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const organization = await createOrganization({
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: organization }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateOrganizationCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

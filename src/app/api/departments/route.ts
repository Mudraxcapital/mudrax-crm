// ============================================================================
// src/app/api/departments/route.ts
//
// Department API — GET (list, requires `organization.view`) and POST
// (create, requires `department.manage`). `organizationId` always comes
// from the acting User's own Authorization Context, never from the request
// body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createDepartment,
  createDepartmentSchema,
  DuplicateDepartmentCodeError,
  listDepartments,
} from "@/modules/organization";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "organization.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const departments = await listDepartments(current.authContext.organizationId);
  return NextResponse.json({ data: departments });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "department.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const department = await createDepartment({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateDepartmentCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

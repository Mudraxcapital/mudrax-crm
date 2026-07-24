// ============================================================================
// src/app/api/departments/[id]/route.ts
//
// Department API — GET (read one, requires `organization.view`) and PATCH
// (update, requires `department.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  DepartmentNotFoundError,
  DuplicateDepartmentCodeError,
  getDepartment,
  updateDepartment,
  updateDepartmentSchema,
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
    const department = await getDepartment(id);
    return NextResponse.json({ data: department });
  } catch (error) {
    if (error instanceof DepartmentNotFoundError) {
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
  if (!hasPermission(current.authContext, "department.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const department = await updateDepartment({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: department });
  } catch (error) {
    if (error instanceof DepartmentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DuplicateDepartmentCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

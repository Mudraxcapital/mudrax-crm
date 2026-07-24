// ============================================================================
// src/app/api/branches/[id]/route.ts
//
// Branch API — GET (read one, requires `organization.view`) and PATCH
// (update, requires `branch.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  BranchNotFoundError,
  DuplicateBranchCodeError,
  getBranch,
  updateBranch,
  updateBranchSchema,
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
    const branch = await getBranch(id);
    return NextResponse.json({ data: branch });
  } catch (error) {
    if (error instanceof BranchNotFoundError) {
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
  if (!hasPermission(current.authContext, "branch.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const branch = await updateBranch({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: branch });
  } catch (error) {
    if (error instanceof BranchNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DuplicateBranchCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

// ============================================================================
// src/app/api/branches/route.ts
//
// Branch API — GET (list, requires `organization.view`) and POST (create,
// requires `branch.manage`). `organizationId` always comes from the acting
// User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createBranch,
  createBranchSchema,
  DuplicateBranchCodeError,
  listBranches,
} from "@/modules/organization";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "organization.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branches = await listBranches(current.authContext.organizationId);
  return NextResponse.json({ data: branches });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "branch.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const branch = await createBranch({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: branch }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateBranchCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

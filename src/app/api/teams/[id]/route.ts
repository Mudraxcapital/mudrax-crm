// ============================================================================
// src/app/api/teams/[id]/route.ts
//
// Team API — GET (read one, requires `organization.view`) and PATCH
// (update, requires `team.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  DuplicateTeamCodeError,
  getTeam,
  InvalidBranchReferenceError,
  TeamNotFoundError,
  updateTeam,
  updateTeamSchema,
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
    const team = await getTeam(id);
    return NextResponse.json({ data: team });
  } catch (error) {
    if (error instanceof TeamNotFoundError) {
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
  if (!hasPermission(current.authContext, "team.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const team = await updateTeam({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: team });
  } catch (error) {
    if (error instanceof TeamNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DuplicateTeamCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InvalidBranchReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

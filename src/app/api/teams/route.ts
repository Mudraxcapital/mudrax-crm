// ============================================================================
// src/app/api/teams/route.ts
//
// Team API — GET (list, requires `organization.view`) and POST (create,
// requires `team.manage`). `organizationId` always comes from the acting
// User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createTeam,
  createTeamSchema,
  DuplicateTeamCodeError,
  InvalidBranchReferenceError,
  listTeams,
} from "@/modules/organization";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "organization.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teams = await listTeams(current.authContext.organizationId);
  return NextResponse.json({ data: teams });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "team.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const team = await createTeam({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateTeamCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InvalidBranchReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

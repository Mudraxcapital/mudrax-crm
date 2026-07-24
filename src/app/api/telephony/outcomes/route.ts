// ============================================================================
// src/app/api/telephony/outcomes/route.ts
//
// Call Outcome catalog API — GET (list, requires `call.view`) and POST
// (create, requires `call.outcome.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createCallOutcome,
  createCallOutcomeSchema,
  DuplicateCallOutcomeNameError,
  listCallOutcomes,
} from "@/modules/telephony";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const outcomes = await listCallOutcomes(current.authContext.organizationId);
  return NextResponse.json({ data: outcomes });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "call.outcome.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCallOutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const outcome = await createCallOutcome({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: outcome }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateCallOutcomeNameError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

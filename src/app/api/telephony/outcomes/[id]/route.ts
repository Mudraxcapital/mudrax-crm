// ============================================================================
// src/app/api/telephony/outcomes/[id]/route.ts
//
// Call Outcome catalog API — GET (read one, requires `call.view`) and
// PATCH (update, requires `call.outcome.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CallOutcomeNotFoundError,
  DuplicateCallOutcomeNameError,
  getCallOutcome,
  updateCallOutcome,
  updateCallOutcomeSchema,
} from "@/modules/telephony";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const outcome = await getCallOutcome(id);
    if (outcome.organizationId !== current.authContext.organizationId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ data: outcome });
  } catch (error) {
    if (error instanceof CallOutcomeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.outcome.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateCallOutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const existing = await getCallOutcome(id);
    if (existing.organizationId !== current.authContext.organizationId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const outcome = await updateCallOutcome({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: outcome });
  } catch (error) {
    if (error instanceof CallOutcomeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DuplicateCallOutcomeNameError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

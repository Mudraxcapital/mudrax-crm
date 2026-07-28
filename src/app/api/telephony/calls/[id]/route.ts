// ============================================================================
// src/app/api/telephony/calls/[id]/route.ts
//
// Call Attempt API — GET (read one, requires `call.view`) and PATCH
// (transition status/record outcome, requires `call.update`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CallAttemptNotFoundError,
  getCallAttempt,
  InvalidCallOutcomeReferenceError,
  InvalidCallStatusTransitionError,
  updateCallAttemptStatus,
  updateCallAttemptStatusSchema,
} from "@/modules/telephony";
import { canAccessCall } from "@/shared/auth/assertCanAccessCall";

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
    const call = await getCallAttempt(id);
    if (!canAccessCall(current.authContext, call)) {
      return NextResponse.json({ error: "Call not found or access denied." }, { status: 404 });
    }
    return NextResponse.json({ data: call });
  } catch (error) {
    if (error instanceof CallAttemptNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateCallAttemptStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const existing = await getCallAttempt(id);
    if (!canAccessCall(current.authContext, existing, { permissionCode: "call.update" })) {
      return NextResponse.json({ error: "Call not found or access denied." }, { status: 404 });
    }

    const call = await updateCallAttemptStatus({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: call });
  } catch (error) {
    if (error instanceof CallAttemptNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof InvalidCallStatusTransitionError ||
      error instanceof InvalidCallOutcomeReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

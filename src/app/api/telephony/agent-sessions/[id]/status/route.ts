// ============================================================================
// src/app/api/telephony/agent-sessions/[id]/status/route.ts
//
// Agent Session API — PATCH (availability change; own session under
// `agent_session.self`, any session under `agent_session.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AgentSessionAlreadyEndedError,
  AgentSessionNotFoundError,
  changeAgentSessionStatus,
  changeAgentSessionStatusSchema,
  getAgentSession,
} from "@/modules/telephony";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = hasPermission(current.authContext, "agent_session.manage");
  const canSelf = hasPermission(current.authContext, "agent_session.self");
  if (!canManage && !canSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = changeAgentSessionStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const existing = await getAgentSession(id);
    if (!canManage && existing.userId !== current.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agentSession = await changeAgentSessionStatus({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: agentSession });
  } catch (error) {
    if (error instanceof AgentSessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof AgentSessionAlreadyEndedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

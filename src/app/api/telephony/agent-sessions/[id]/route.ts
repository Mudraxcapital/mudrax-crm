// ============================================================================
// src/app/api/telephony/agent-sessions/[id]/route.ts
//
// Agent Session API — GET (read one; own session under `agent_session.self`,
// any session under `agent_session.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { AgentSessionNotFoundError, getAgentSession } from "@/modules/telephony";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
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
  try {
    const agentSession = await getAgentSession(id);
    if (!canManage && agentSession.userId !== current.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ data: agentSession });
  } catch (error) {
    if (error instanceof AgentSessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

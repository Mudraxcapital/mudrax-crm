// ============================================================================
// src/app/api/telephony/agent-sessions/route.ts
//
// Agent Session API — GET (list, requires `agent_session.manage`) and POST
// (start own session / Login, requires `agent_session.self`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AgentSessionAlreadyActiveError,
  InvalidAgentReferenceError,
  listAgentSessions,
  startAgentSession,
  startAgentSessionSchema,
} from "@/modules/telephony";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "agent_session.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await listAgentSessions(current.authContext.organizationId);
  return NextResponse.json({ data: sessions });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "agent_session.self")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = startAgentSessionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const agentSession = await startAgentSession({
      organizationId: current.authContext.organizationId,
      userId: current.session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: agentSession }, { status: 201 });
  } catch (error) {
    if (
      error instanceof AgentSessionAlreadyActiveError ||
      error instanceof InvalidAgentReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

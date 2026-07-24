"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/endAgentSession.action.ts
//
// Server Action for Agent Logout. An Agent may end their own session under
// `agent_session.self`; a Team Leader holding `agent_session.manage` may
// end any Agent's session.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AgentSessionAlreadyEndedError,
  AgentSessionNotFoundError,
  endAgentSession,
  getAgentSession,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function endAgentSessionAction(
  id: string,
  previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  void previousState;
  void formData;
  const { session, authContext } = await requireAuth();

  const canSelf = hasPermission(authContext, "agent_session.self");
  const canManage = hasPermission(authContext, "agent_session.manage");
  if (!canSelf && !canManage) {
    return { error: "You do not have permission to end an Agent Session." };
  }

  try {
    const existing = await getAgentSession(id);
    if (existing.userId !== session.user.id && !canManage) {
      return { error: "You may only log out of your own Agent Session." };
    }

    await endAgentSession({ id, actor: { actorType: "USER", actorId: session.user.id } });
  } catch (error) {
    if (
      error instanceof AgentSessionNotFoundError ||
      error instanceof AgentSessionAlreadyEndedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/telephony/agent-sessions");
  return {};
}

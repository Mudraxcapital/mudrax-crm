"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/changeAgentSessionStatus.action.ts
//
// Server Action for changing Agent availability. An Agent may change their
// own session's status under `agent_session.self`; a Team Leader holding
// `agent_session.manage` may change any Agent's session.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AgentSessionAlreadyEndedError,
  AgentSessionNotFoundError,
  changeAgentSessionStatus,
  changeAgentSessionStatusSchema,
  getAgentSession,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function changeAgentSessionStatusAction(
  id: string,
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session, authContext } = await requireAuth();

  const canSelf = hasPermission(authContext, "agent_session.self");
  const canManage = hasPermission(authContext, "agent_session.manage");
  if (!canSelf && !canManage) {
    return { error: "You do not have permission to change Agent Session availability." };
  }

  const parsed = changeAgentSessionStatusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const existing = await getAgentSession(id);
    if (existing.userId !== session.user.id && !canManage) {
      return { error: "You may only change your own Agent Session's availability." };
    }

    await changeAgentSessionStatus({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
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

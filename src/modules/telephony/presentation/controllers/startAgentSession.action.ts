"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/startAgentSession.action.ts
//
// Server Action for Agent Login. Requires `agent_session.self` — an Agent
// may only start their own session.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  AgentSessionAlreadyActiveError,
  InvalidAgentReferenceError,
  startAgentSession,
  startAgentSessionSchema,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function startAgentSessionAction(
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session, authContext } = await requirePermission("agent_session.self");

  const parsed = startAgentSessionSchema.safeParse({
    extensionNumber: formData.get("extensionNumber") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await startAgentSession({
      organizationId: authContext.organizationId,
      userId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof AgentSessionAlreadyActiveError ||
      error instanceof InvalidAgentReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/telephony/agent-sessions");
  return {};
}

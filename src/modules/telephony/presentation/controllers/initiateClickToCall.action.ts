"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/initiateClickToCall.action.ts
//
// Server Action backing the Click-to-Call form. Requires `call.initiate`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  initiateClickToCall,
  initiateClickToCallSchema,
  InvalidAgentReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
} from "@/modules/telephony";

export interface TelephonyFormState {
  error?: string;
}

export async function initiateClickToCallAction(
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session, authContext } = await requirePermission("call.initiate");

  const parsed = initiateClickToCallSchema.safeParse({
    leadId: formData.get("leadId") || undefined,
    customerId: formData.get("customerId") || undefined,
    agentUserId: formData.get("agentUserId") || undefined,
    toPhoneNumber: formData.get("toPhoneNumber") || undefined,
    callerIdUsed: formData.get("callerIdUsed") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let callId: string;
  try {
    const call = await initiateClickToCall({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    callId = call.id;
  } catch (error) {
    if (
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidAgentReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/telephony/calls");
  redirect(`/telephony/calls/${callId}`);
}

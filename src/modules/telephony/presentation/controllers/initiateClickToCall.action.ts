"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/initiateClickToCall.action.ts
//
// Server Action backing the Click-to-Call form. Requires `call.initiate`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { isCallerWorkspaceUser } from "@/modules/rbac";
import { getLead, LeadNotFoundError } from "@/modules/leads";
import {
  initiateClickToCall,
  initiateClickToCallSchema,
  InvalidAgentReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
} from "@/modules/telephony";
import {
  assertCanAccessLead,
  LeadAccessDeniedError,
} from "@/shared/auth/assertCanAccessLead";

export interface TelephonyFormState {
  error?: string;
  /** Set when the call was created and the UI should stay on the current page. */
  callId?: string;
}

/**
 * Allowlist for post-call return paths so agents stay in Campaign Dashboard
 * (or caller lead workspace) instead of being forced into /telephony.
 */
function resolveSafeReturnPath(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  if (raw.includes("://") || raw.includes("\\")) return null;
  const pathOnly = raw.split("?")[0]?.split("#")[0] ?? "";
  if (/^\/campaigns\/[^/]+\/dashboard$/.test(pathOnly)) return raw;
  if (/^\/caller\/leads\/[^/]+$/.test(pathOnly)) return raw;
  return null;
}

export async function initiateClickToCallAction(
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session, authContext } = await requirePermission("call.initiate");
  const callerWorkspace = isCallerWorkspaceUser(authContext);
  const returnPath = resolveSafeReturnPath(formData.get("returnPath"));

  const parsed = initiateClickToCallSchema.safeParse({
    leadId: formData.get("leadId") || undefined,
    customerId: formData.get("customerId") || undefined,
    // Callers may only place calls as themselves.
    agentUserId: callerWorkspace
      ? session.user.id
      : formData.get("agentUserId") || session.user.id,
    toPhoneNumber: formData.get("toPhoneNumber") || undefined,
    callerIdUsed: formData.get("callerIdUsed") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let callId: string;
  try {
    // Callers (SELF) may only initiate calls for leads assigned to them.
    if (parsed.data.leadId) {
      const lead = await getLead(parsed.data.leadId);
      assertCanAccessLead(authContext, lead, {
        permissionCode: "lead.view",
        actorUserId: session.user.id,
      });
    }

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
      error instanceof InvalidAgentReferenceError ||
      error instanceof LeadNotFoundError ||
      error instanceof LeadAccessDeniedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  const leadId = parsed.data.leadId;

  // Campaign Dashboard / in-place workspace: create Call Attempt, stay put.
  if (returnPath) {
    const pathOnly = returnPath.split("?")[0]?.split("#")[0] ?? returnPath;
    revalidatePath(pathOnly);
    if (leadId) {
      revalidatePath(`/leads/${leadId}`);
      revalidatePath(`/caller/leads/${leadId}`);
    }
    revalidatePath("/telephony/calls");
    revalidatePath("/caller/history");
    return { callId };
  }

  if (callerWorkspace) {
    revalidatePath("/");
    revalidatePath("/caller/history");
    if (leadId) {
      revalidatePath(`/caller/leads/${leadId}`);
      redirect(`/caller/leads/${leadId}#call`);
    }
    redirect("/caller/history");
  }

  revalidatePath("/telephony/calls");
  redirect(`/telephony/calls/${callId}`);
}

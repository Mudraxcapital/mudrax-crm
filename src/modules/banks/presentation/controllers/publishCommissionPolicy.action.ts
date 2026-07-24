"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  publishCommissionPolicy,
  CommissionPolicyNotFoundError,
  InvalidCommissionPolicyTransitionError,
} from "@/modules/banks";
import type { BanksFormState } from "./banksFormState";

export async function publishCommissionPolicyAction(
  bankId: string,
  policyId: string,
): Promise<BanksFormState> {
  const { session, authContext } = await requirePermission("commission_policy.publish");
  try {
    await publishCommissionPolicy({
      policyId,
      organizationId: authContext.organizationId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath(`/banks/${bankId}`);
    return {};
  } catch (error) {
    if (
      error instanceof CommissionPolicyNotFoundError ||
      error instanceof InvalidCommissionPolicyTransitionError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

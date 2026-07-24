"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createCommissionPolicy,
  createCommissionPolicySchema,
  BankNotFoundError,
} from "@/modules/banks";
import type { BanksFormState } from "./banksFormState";

export async function createCommissionPolicyAction(
  bankId: string,
  _previousState: BanksFormState | undefined,
  formData: FormData,
): Promise<BanksFormState> {
  const { session, authContext } = await requirePermission("commission_policy.publish");
  const parsed = createCommissionPolicySchema.safeParse({
    loanProductId: formData.get("loanProductId") || null,
    ratePercent: formData.get("ratePercent"),
    clawbackWindowDays: formData.get("clawbackWindowDays") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await createCommissionPolicy({
      bankId,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath(`/banks/${bankId}`);
    return {};
  } catch (error) {
    if (error instanceof BankNotFoundError) return { error: error.message };
    throw error;
  }
}

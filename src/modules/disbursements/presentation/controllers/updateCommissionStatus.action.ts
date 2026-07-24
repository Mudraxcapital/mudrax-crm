"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  updateCommissionStatus, updateCommissionStatusSchema,
  CommissionNotFoundError, InvalidCommissionTransitionError,
} from "@/modules/disbursements";
import type { DisbursementsFormState } from "./disbursementsFormState";

export async function updateCommissionStatusAction(
  commissionId: string, _prev: DisbursementsFormState | undefined, formData: FormData,
): Promise<DisbursementsFormState> {
  const { session, authContext } = await requirePermission("commission.reconcile");
  const parsed = updateCommissionStatusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await updateCommissionStatus({
      commissionId,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/disbursements");
    revalidatePath("/loans");
    return {};
  } catch (error) {
    if (error instanceof CommissionNotFoundError || error instanceof InvalidCommissionTransitionError) {
      return { error: error.message };
    }
    throw error;
  }
}

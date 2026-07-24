"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  recordDisbursement, recordDisbursementSchema,
  ApplicationNotApprovedError, CommissionPolicyMissingError, DuplicateBankReferenceError,
} from "@/modules/disbursements";
import type { DisbursementsFormState } from "./disbursementsFormState";

export async function recordDisbursementAction(
  _prev: DisbursementsFormState | undefined, formData: FormData,
): Promise<DisbursementsFormState> {
  const { session, authContext } = await requirePermission("disbursement.record");
  const parsed = recordDisbursementSchema.safeParse({
    loanApplicationId: formData.get("loanApplicationId"),
    bankReferenceNumber: formData.get("bankReferenceNumber"),
    amount: formData.get("amount"),
    scheduledAt: formData.get("scheduledAt") || null,
    markDisbursed: formData.get("markDisbursed") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const d = await recordDisbursement({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/disbursements");
    revalidatePath("/loan-accounts");
    revalidatePath("/loans");
    redirect(`/disbursements/${d.id}`);
  } catch (error) {
    if (
      error instanceof ApplicationNotApprovedError ||
      error instanceof CommissionPolicyMissingError ||
      error instanceof DuplicateBankReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

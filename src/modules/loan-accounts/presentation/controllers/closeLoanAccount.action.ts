"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import { closeLoanAccount, InvalidLoanAccountTransitionError, LoanAccountNotFoundError } from "@/modules/loan-accounts";

export async function closeLoanAccountAction(accountId: string): Promise<{ error?: string }> {
  const { session, authContext } = await requirePermission("loan_account.manage");
  try {
    await closeLoanAccount({
      accountId,
      organizationId: authContext.organizationId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/loan-accounts");
    revalidatePath(`/loan-accounts/${accountId}`);
    return {};
  } catch (error) {
    if (error instanceof InvalidLoanAccountTransitionError || error instanceof LoanAccountNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  updateBank,
  updateBankSchema,
  BankNotFoundError,
  DuplicateBankCodeError,
  DuplicateBankNameError,
} from "@/modules/banks";
import type { BanksFormState } from "./banksFormState";

export async function updateBankAction(
  bankId: string,
  _previousState: BanksFormState | undefined,
  formData: FormData,
): Promise<BanksFormState> {
  const { session, authContext } = await requirePermission("bank.manage");
  const parsed = updateBankSchema.safeParse({
    name: formData.get("name") || undefined,
    code: formData.get("code") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await updateBank({
      bankId,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/banks");
    revalidatePath(`/banks/${bankId}`);
    return {};
  } catch (error) {
    if (
      error instanceof BankNotFoundError ||
      error instanceof DuplicateBankCodeError ||
      error instanceof DuplicateBankNameError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

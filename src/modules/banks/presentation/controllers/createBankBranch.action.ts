"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createBankBranch,
  createBankBranchSchema,
  BankNotFoundError,
  DuplicateBankBranchCodeError,
} from "@/modules/banks";
import type { BanksFormState } from "./banksFormState";

export async function createBankBranchAction(
  bankId: string,
  _previousState: BanksFormState | undefined,
  formData: FormData,
): Promise<BanksFormState> {
  const { session, authContext } = await requirePermission("bank.manage");
  const parsed = createBankBranchSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await createBankBranch({
      bankId,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath(`/banks/${bankId}`);
    return {};
  } catch (error) {
    if (error instanceof BankNotFoundError || error instanceof DuplicateBankBranchCodeError) {
      return { error: error.message };
    }
    throw error;
  }
}

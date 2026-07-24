"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createBank,
  createBankSchema,
  DuplicateBankCodeError,
  DuplicateBankNameError,
} from "@/modules/banks";
import type { BanksFormState } from "./banksFormState";

export async function createBankAction(
  _previousState: BanksFormState | undefined,
  formData: FormData,
): Promise<BanksFormState> {
  const { session, authContext } = await requirePermission("bank.manage");
  const parsed = createBankSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const bank = await createBank({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/banks");
    redirect(`/banks/${bank.id}`);
  } catch (error) {
    if (error instanceof DuplicateBankCodeError || error instanceof DuplicateBankNameError) {
      return { error: error.message };
    }
    throw error;
  }
}

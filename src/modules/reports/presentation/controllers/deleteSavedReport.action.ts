"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  deleteSavedReport,
  deleteSavedReportSchema,
  SavedReportNotFoundError,
} from "@/modules/reports";
import type { ReportsFormState } from "./reportsFormState";

export async function deleteSavedReportAction(
  _previousState: ReportsFormState | undefined,
  formData: FormData,
): Promise<ReportsFormState> {
  const { session, authContext } = await requirePermission("report.manage");

  const parsed = deleteSavedReportSchema.safeParse({
    savedReportId: formData.get("savedReportId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await deleteSavedReport({
      organizationId: authContext.organizationId,
      ownerUserId: session.user.id,
      savedReportId: parsed.data.savedReportId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/reports/saved");
    return { success: "Saved report deleted." };
  } catch (error) {
    if (error instanceof SavedReportNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

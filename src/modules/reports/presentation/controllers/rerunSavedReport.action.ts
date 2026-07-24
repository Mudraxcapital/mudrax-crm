"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  rerunSavedReport,
  rerunSavedReportSchema,
  SavedReportNotFoundError,
} from "@/modules/reports";
import type { ReportsFormState } from "./reportsFormState";

export async function rerunSavedReportAction(
  _previousState: ReportsFormState | undefined,
  formData: FormData,
): Promise<ReportsFormState> {
  const { session, authContext } = await requirePermission("report.view");

  const parsed = rerunSavedReportSchema.safeParse({
    savedReportId: formData.get("savedReportId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const execution = await rerunSavedReport({
      organizationId: authContext.organizationId,
      ownerUserId: session.user.id,
      savedReportId: parsed.data.savedReportId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/reports/saved");
    redirect(`/reports/executions/${execution.id}`);
  } catch (error) {
    if (error instanceof SavedReportNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

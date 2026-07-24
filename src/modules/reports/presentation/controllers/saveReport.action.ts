"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
  saveReport,
  saveReportSchema,
} from "@/modules/reports";
import type { ReportsFormState } from "./reportsFormState";

export async function saveReportAction(
  _previousState: ReportsFormState | undefined,
  formData: FormData,
): Promise<ReportsFormState> {
  const { session, authContext } = await requirePermission("report.manage");

  const parsed = saveReportSchema.safeParse({
    name: formData.get("name"),
    reportType: formData.get("reportType"),
    templateId: formData.get("templateId") || undefined,
    filter: {
      dateFrom: formData.get("dateFrom") || null,
      dateTo: formData.get("dateTo") || null,
      branchId: formData.get("branchId") || null,
      departmentId: formData.get("departmentId") || null,
      teamId: formData.get("teamId") || null,
      userId: formData.get("userId") || null,
    },
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const saved = await saveReport({
      organizationId: authContext.organizationId,
      ownerUserId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/reports/saved");
    redirect(`/reports/saved`);
    return { success: `Saved report "${saved.name}".` };
  } catch (error) {
    if (
      error instanceof ReportTemplateNotFoundError ||
      error instanceof ReportTemplateNotPublishedError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

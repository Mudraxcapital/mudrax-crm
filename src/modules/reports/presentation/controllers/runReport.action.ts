"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
  runReport,
  runReportSchema,
} from "@/modules/reports";
import { mergeReportHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";
import type { ReportsFormState } from "./reportsFormState";

export async function runReportAction(
  _previousState: ReportsFormState | undefined,
  formData: FormData,
): Promise<ReportsFormState> {
  const { session, authContext } = await requirePermission("report.view");

  const parsed = runReportSchema.safeParse({
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
    const execution = await runReport({
      organizationId: authContext.organizationId,
      input: {
        ...parsed.data,
        filter: mergeReportHierarchyFilter(authContext, parsed.data.filter),
      },
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/reports");
    redirect(`/reports/executions/${execution.id}`);
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

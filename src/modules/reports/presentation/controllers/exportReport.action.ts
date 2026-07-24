"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  exportReport,
  exportReportSchema,
  ReportExecutionNotCompletedError,
  ReportExecutionNotFoundError,
  UnsupportedExportFormatError,
} from "@/modules/reports";
import type { ReportsFormState } from "./reportsFormState";

export async function exportReportAction(
  _previousState: ReportsFormState | undefined,
  formData: FormData,
): Promise<ReportsFormState> {
  const { session, authContext } = await requirePermission("export.create");

  const parsed = exportReportSchema.safeParse({
    reportExecutionId: formData.get("reportExecutionId"),
    format: formData.get("format"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const rendered = await exportReport({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath(`/reports/executions/${parsed.data.reportExecutionId}`);
    return {
      success: `${parsed.data.format} export ready.`,
      exportJobId: rendered.job.id,
      downloadPath: rendered.job.downloadPath ?? undefined,
    };
  } catch (error) {
    if (
      error instanceof ReportExecutionNotFoundError ||
      error instanceof ReportExecutionNotCompletedError ||
      error instanceof UnsupportedExportFormatError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

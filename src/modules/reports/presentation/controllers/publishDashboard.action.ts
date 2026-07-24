"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  DashboardNotFoundError,
  publishDashboard,
  publishDashboardSchema,
} from "@/modules/reports";
import type { ReportsFormState } from "./reportsFormState";

export async function publishDashboardAction(
  _previousState: ReportsFormState | undefined,
  formData: FormData,
): Promise<ReportsFormState> {
  const { session, authContext } = await requirePermission("dashboard.manage");

  const parsed = publishDashboardSchema.safeParse({
    dashboardId: formData.get("dashboardId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await publishDashboard({
      organizationId: authContext.organizationId,
      dashboardId: parsed.data.dashboardId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/reports/dashboards");
    revalidatePath(`/reports/dashboards/${parsed.data.dashboardId}`);
    return { success: "Dashboard published." };
  } catch (error) {
    if (error instanceof DashboardNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

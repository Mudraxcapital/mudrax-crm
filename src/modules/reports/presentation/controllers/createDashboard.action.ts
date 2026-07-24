"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createDashboard,
  createDashboardSchema,
  KpiNotFoundError,
} from "@/modules/reports";
import type { ReportsFormState } from "./reportsFormState";

export async function createDashboardAction(
  _previousState: ReportsFormState | undefined,
  formData: FormData,
): Promise<ReportsFormState> {
  const { session, authContext } = await requirePermission("dashboard.manage");

  const kpiNames = formData.getAll("kpiName").filter((value): value is string => typeof value === "string" && value.length > 0);

  const parsed = createDashboardSchema.safeParse({
    name: formData.get("name"),
    audience: formData.get("audience"),
    widgets: kpiNames.map((kpiName, index) => ({
      visualizationType: "counter",
      kpiName,
      sortOrder: index,
    })),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const dashboard = await createDashboard({
      organizationId: authContext.organizationId,
      ownerUserId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/reports/dashboards");
    redirect(`/reports/dashboards/${dashboard.id}`);
  } catch (error) {
    if (error instanceof KpiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

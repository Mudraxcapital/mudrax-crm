"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import { archiveNotificationTemplate } from "@/modules/notifications";

export async function archiveNotificationTemplateAction(
  templateId: string,
  formData: FormData,
): Promise<void> {
  void formData;
  const { session, authContext } = await requirePermission("notification.template.manage");

  await archiveNotificationTemplate({
    organizationId: authContext.organizationId,
    templateId,
    actor: { actorType: "USER", actorId: session.user.id },
  });

  revalidatePath("/notifications/templates");
  revalidatePath(`/notifications/templates/${templateId}`);
}

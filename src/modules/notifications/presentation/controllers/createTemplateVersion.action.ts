"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createTemplateVersion,
  createTemplateVersionSchema,
  NotificationTemplateArchivedError,
  NotificationTemplateNotFoundError,
} from "@/modules/notifications";
import type { NotificationsFormState } from "./notificationsFormState";

export async function createTemplateVersionAction(
  templateId: string,
  _previousState: NotificationsFormState | undefined,
  formData: FormData,
): Promise<NotificationsFormState> {
  const { session, authContext } = await requirePermission("notification.template.manage");

  const parsed = createTemplateVersionSchema.safeParse({
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
    publish: formData.get("publish") === "on" || formData.get("publish") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createTemplateVersion({
      organizationId: authContext.organizationId,
      templateId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof NotificationTemplateNotFoundError ||
      error instanceof NotificationTemplateArchivedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/notifications/templates/${templateId}`);
  return {};
}

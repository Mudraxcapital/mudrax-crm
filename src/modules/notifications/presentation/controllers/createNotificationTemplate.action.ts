"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createNotificationTemplate,
  createNotificationTemplateSchema,
  DuplicateNotificationTemplateCodeError,
} from "@/modules/notifications";
import type { NotificationsFormState } from "./notificationsFormState";

export async function createNotificationTemplateAction(
  _previousState: NotificationsFormState | undefined,
  formData: FormData,
): Promise<NotificationsFormState> {
  const { session, authContext } = await requirePermission("notification.template.manage");

  const parsed = createNotificationTemplateSchema.safeParse({
    code: formData.get("code"),
    channelType: formData.get("channelType"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
    publish: formData.get("publish") === "on" || formData.get("publish") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let templateId: string;
  try {
    const template = await createNotificationTemplate({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    templateId = template.id;
  } catch (error) {
    if (error instanceof DuplicateNotificationTemplateCodeError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/notifications/templates");
  redirect(`/notifications/templates/${templateId}`);
}

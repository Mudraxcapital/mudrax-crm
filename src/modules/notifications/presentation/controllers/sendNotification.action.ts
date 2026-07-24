"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
  NoPublishedTemplateVersionError,
  NotificationSuppressedByPreferenceError,
  NotificationTemplateNotActiveError,
  NotificationTemplateNotFoundError,
  sendNotification,
  sendNotificationSchema,
} from "@/modules/notifications";
import type { NotificationsFormState } from "./notificationsFormState";

export async function sendNotificationAction(
  _previousState: NotificationsFormState | undefined,
  formData: FormData,
): Promise<NotificationsFormState> {
  const { session, authContext } = await requirePermission("notification.send");

  const payloadRaw = formData.get("payload");
  let payload: Record<string, unknown> | undefined;
  if (typeof payloadRaw === "string" && payloadRaw.trim()) {
    try {
      payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    } catch {
      return { error: "Payload must be valid JSON." };
    }
  }

  const maxRetryRaw = formData.get("maxRetryAttempts");
  const parsed = sendNotificationSchema.safeParse({
    templateId: formData.get("templateId"),
    category: formData.get("category"),
    recipientType: formData.get("recipientType"),
    recipientId: formData.get("recipientId"),
    eventCategory: formData.get("eventCategory") || undefined,
    recipientAddress: formData.get("recipientAddress") || undefined,
    payload,
    maxRetryAttempts: maxRetryRaw ? Number(maxRetryRaw) : undefined,
    processImmediately: formData.get("processImmediately") !== "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let notificationId: string;
  try {
    const notification = await sendNotification({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    notificationId = notification.id;
  } catch (error) {
    if (
      error instanceof NotificationTemplateNotFoundError ||
      error instanceof NotificationTemplateNotActiveError ||
      error instanceof NoPublishedTemplateVersionError ||
      error instanceof InvalidUserReferenceError ||
      error instanceof InvalidCustomerReferenceError ||
      error instanceof NotificationSuppressedByPreferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/notifications");
  revalidatePath("/notifications/queue");
  revalidatePath("/notifications/history");
  redirect(`/notifications/${notificationId}`);
}

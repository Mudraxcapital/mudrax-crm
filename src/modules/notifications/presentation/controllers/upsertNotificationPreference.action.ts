"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
  upsertNotificationPreference,
  upsertNotificationPreferenceSchema,
} from "@/modules/notifications";
import type { NotificationsFormState } from "./notificationsFormState";

export async function upsertNotificationPreferenceAction(
  _previousState: NotificationsFormState | undefined,
  formData: FormData,
): Promise<NotificationsFormState> {
  const { session, authContext } = await requirePermission("notification.preference.manage");

  const channelTypeRaw = formData.get("channelType");
  const parsed = upsertNotificationPreferenceSchema.safeParse({
    recipientType: formData.get("recipientType"),
    recipientId: formData.get("recipientId"),
    eventCategory: formData.get("eventCategory"),
    channelType: channelTypeRaw === "" || channelTypeRaw === null ? null : channelTypeRaw,
    isEnabled: formData.get("isEnabled") === "on" || formData.get("isEnabled") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await upsertNotificationPreference({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof InvalidUserReferenceError ||
      error instanceof InvalidCustomerReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/notifications/preferences");
  return {};
}

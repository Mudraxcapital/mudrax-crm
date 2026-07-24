"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  processNotificationQueue,
  processNotificationQueueSchema,
  retryNotificationDeliveries,
} from "@/modules/notifications";
import type { NotificationsFormState } from "./notificationsFormState";

export async function processNotificationQueueAction(): Promise<NotificationsFormState> {
  const { session, authContext } = await requirePermission("notification.queue.process");

  const parsed = processNotificationQueueSchema.safeParse({ limit: 25 });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await processNotificationQueue({
    organizationId: authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: session.user.id },
  });

  revalidatePath("/notifications/queue");
  revalidatePath("/notifications");
  return {};
}

export async function retryFailedDeliveriesAction(): Promise<NotificationsFormState> {
  const { session, authContext } = await requirePermission("notification.queue.process");

  await retryNotificationDeliveries({
    organizationId: authContext.organizationId,
    input: { limit: 25 },
    actor: { actorType: "USER", actorId: session.user.id },
  });

  revalidatePath("/notifications/queue");
  revalidatePath("/notifications");
  revalidatePath("/notifications/history");
  return {};
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  listNotificationQueueEntries,
  processNotificationQueue,
  processNotificationQueueSchema,
  retryNotificationDeliveries,
} from "@/modules/notifications";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await listNotificationQueueEntries(current.authContext.organizationId);
  return NextResponse.json({ data: entries });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.queue.process")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.action === "retry") {
    const deliveries = await retryNotificationDeliveries({
      organizationId: current.authContext.organizationId,
      input: { limit: body.limit ?? 25, deliveryId: body.deliveryId },
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: deliveries });
  }

  const parsed = processNotificationQueueSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const deliveries = await processNotificationQueue({
    organizationId: current.authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: current.session.user.id },
  });
  return NextResponse.json({ data: deliveries });
}

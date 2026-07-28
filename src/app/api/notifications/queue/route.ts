import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  listNotificationQueueEntries,
  processNotificationQueue,
  processNotificationQueueSchema,
  retryNotificationDeliveries,
} from "@/modules/notifications";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await listNotificationQueueEntries(current.authContext.organizationId);
  return NextResponse.json({ data: entries });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
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

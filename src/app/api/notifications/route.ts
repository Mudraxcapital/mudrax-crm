import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
  listNotifications,
  NoPublishedTemplateVersionError,
  NotificationSuppressedByPreferenceError,
  NotificationTemplateNotActiveError,
  NotificationTemplateNotFoundError,
  sendNotification,
  sendNotificationSchema,
} from "@/modules/notifications";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const notifications = await listNotifications(current.authContext.organizationId, {
    status: status as never,
  });
  return NextResponse.json({ data: notifications });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.send")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sendNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const notification = await sendNotification({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: notification }, { status: 201 });
  } catch (error) {
    if (
      error instanceof NotificationTemplateNotFoundError ||
      error instanceof NotificationTemplateNotActiveError ||
      error instanceof NoPublishedTemplateVersionError ||
      error instanceof InvalidUserReferenceError ||
      error instanceof InvalidCustomerReferenceError ||
      error instanceof NotificationSuppressedByPreferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

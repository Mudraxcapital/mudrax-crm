import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
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
import { notificationRecipientFilter } from "@/shared/auth/notificationRecipientFilter";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const mine =
    url.searchParams.get("mine") === "1" || url.searchParams.get("mine") === "true";
  const limitRaw = Number(url.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
  const offsetRaw = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  // Personal Notification Channel: always the signed-in recipient (all 4 roles).
  const filter = mine
    ? {
        recipientType: "USER" as const,
        recipientId: current.session.user.id,
        ...(status ? { status: status as never } : {}),
        limit,
        offset,
      }
    : notificationRecipientFilter(current.authContext, {
        permissionCode: "notification.view",
        actorUserId: current.session.user.id,
        status: status as never,
        limit,
        offset,
      });

  const notifications = await listNotifications(
    current.authContext.organizationId,
    filter as Parameters<typeof listNotifications>[1],
  );
  return NextResponse.json({ data: notifications, meta: { limit, offset, mine } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
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

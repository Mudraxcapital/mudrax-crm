import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  InvalidCustomerReferenceError,
  InvalidUserReferenceError,
  listNotificationPreferences,
  upsertNotificationPreference,
  upsertNotificationPreferenceSchema,
} from "@/modules/notifications";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.preference.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const recipientId = url.searchParams.get("recipientId") ?? undefined;
  const preferences = await listNotificationPreferences({ recipientId });
  return NextResponse.json({ data: preferences });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.preference.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertNotificationPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const preference = await upsertNotificationPreference({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: preference }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InvalidUserReferenceError ||
      error instanceof InvalidCustomerReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

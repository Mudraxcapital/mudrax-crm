import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  archiveNotificationTemplate,
  getNotificationTemplate,
  listTemplateVersions,
  NotificationTemplateNotFoundError,
  updateNotificationTemplate,
  updateNotificationTemplateSchema,
} from "@/modules/notifications";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    !hasPermission(current.authContext, "notification.template.manage") &&
    !hasPermission(current.authContext, "notification.view")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const template = await getNotificationTemplate(current.authContext.organizationId, id);
    const versions = await listTemplateVersions(current.authContext.organizationId, id);
    return NextResponse.json({ data: { template, versions } });
  } catch (error) {
    if (error instanceof NotificationTemplateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.template.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (body?.archive === true) {
    try {
      const template = await archiveNotificationTemplate({
        organizationId: current.authContext.organizationId,
        templateId: id,
        actor: { actorType: "USER", actorId: current.session.user.id },
      });
      return NextResponse.json({ data: template });
    } catch (error) {
      if (error instanceof NotificationTemplateNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }
  }

  const parsed = updateNotificationTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const template = await updateNotificationTemplate({
      organizationId: current.authContext.organizationId,
      templateId: id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof NotificationTemplateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  createNotificationTemplate,
  createNotificationTemplateSchema,
  DuplicateNotificationTemplateCodeError,
  listNotificationTemplates,
} from "@/modules/notifications";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (
    !hasPermission(current.authContext, "notification.template.manage") &&
    !hasPermission(current.authContext, "notification.view")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await listNotificationTemplates(current.authContext.organizationId);
  return NextResponse.json({ data: templates });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "notification.template.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createNotificationTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const template = await createNotificationTemplate({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateNotificationTemplateCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

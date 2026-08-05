import { NextResponse } from "next/server";
import { requireApiUser, type ApiAuthResult } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  AdminRoleProtectedError,
  CannotDeleteSelfError,
  canDeleteUserAccounts,
  deleteUser,
  DuplicateUserEmailError,
  DuplicateUserPhoneError,
  getUser,
  InvalidUserHierarchyError,
  LastActiveAdminError,
  SingleAdminLimitError,
  updateUser,
  updateUserSchema,
  UserDeleteBlockedError,
  UserNotFoundError,
} from "@/modules/users";

type Authed = Extract<ApiAuthResult, { ok: true }>["current"];

function accessFrom(current: Authed) {
  return {
    hierarchy: current.authContext.hierarchy,
    actorRoles: current.authContext.roles.map((role) => role.name),
    actorUserId: current.session.user.id,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "user.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const user = await getUser(id, accessFrom(current));
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof InvalidUserHierarchyError || error instanceof AdminRoleProtectedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "user.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const user = await updateUser({
      userId: id,
      input: parsed.data,
      actorRoles: current.authContext.roles.map((role) => role.name),
      hierarchy: current.authContext.hierarchy,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      error instanceof DuplicateUserEmailError ||
      error instanceof DuplicateUserPhoneError ||
      error instanceof AdminRoleProtectedError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof LastActiveAdminError ||
      error instanceof SingleAdminLimitError ||
      error instanceof UserDeleteBlockedError
    ) {
      const status =
        error instanceof InvalidUserHierarchyError ||
        error instanceof AdminRoleProtectedError ||
        error instanceof SingleAdminLimitError
          ? 403
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!canDeleteUserAccounts(current.authContext)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const reassignCallersToTeamLeadId =
    body && typeof body === "object" && typeof body.reassignCallersToTeamLeadId === "string"
      ? body.reassignCallersToTeamLeadId
      : null;
  const reassignTeamLeadsToManagerId =
    body && typeof body === "object" && typeof body.reassignTeamLeadsToManagerId === "string"
      ? body.reassignTeamLeadsToManagerId
      : null;
  const reassignLeadsToUserId =
    body && typeof body === "object" && typeof body.reassignLeadsToUserId === "string"
      ? body.reassignLeadsToUserId
      : null;

  try {
    await deleteUser({
      userId: id,
      actorRoles: current.authContext.roles.map((role) => role.name),
      hierarchy: current.authContext.hierarchy,
      actor: { actorType: "USER", actorId: current.session.user.id },
      reassignCallersToTeamLeadId,
      reassignTeamLeadsToManagerId,
      reassignLeadsToUserId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      error instanceof AdminRoleProtectedError ||
      error instanceof CannotDeleteSelfError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof LastActiveAdminError ||
      error instanceof UserDeleteBlockedError
    ) {
      const status =
        error instanceof InvalidUserHierarchyError || error instanceof AdminRoleProtectedError
          ? 403
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}

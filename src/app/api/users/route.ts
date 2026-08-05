import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  AdminRoleProtectedError,
  createUser,
  createUserSchema,
  DuplicateUserEmailError,
  DuplicateUserPhoneError,
  InvalidUserHierarchyError,
  listUsers,
  listUsersQuerySchema,
  SingleAdminLimitError,
} from "@/modules/users";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!current || !hasPermission(current.authContext, "user.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = listUsersQuerySchema.safeParse({
    search: url.searchParams.get("search") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    teamLeadId: url.searchParams.get("teamLeadId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const hierarchy = current.authContext.hierarchy;
  const users = await listUsers({
    ...parsed.data,
    userIds: hierarchy.visibleUserIds ?? undefined,
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!current || !hasPermission(current.authContext, "user.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const user = await createUser({
      input: parsed.data,
      actorRoles: current.authContext.roles.map((role) => role.name),
      hierarchy: current.authContext.hierarchy,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof DuplicateUserEmailError ||
      error instanceof DuplicateUserPhoneError ||
      error instanceof AdminRoleProtectedError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof SingleAdminLimitError
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

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { canViewUserId, hasPermission } from "@/modules/rbac";
import {
  AdminRoleProtectedError,
  getUser,
  InvalidUserHierarchyError,
  retrieveProfilePhotoBytes,
  UserNotFoundError,
} from "@/modules/users";

export async function GET(request: Request,
  context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  const { id } = await context.params;
  const isSelf = current.session.user.id === id;
  const canViewOthers =
    hasPermission(current.authContext, "user.view") ||
    canViewUserId(current.authContext.hierarchy, id);
  if (!isSelf && !canViewOthers) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = isSelf
      ? await getUser(id)
      : await getUser(id, {
          hierarchy: current.authContext.hierarchy,
          actorRoles: current.authContext.roles.map((role) => role.name),
          actorUserId: current.session.user.id,
        });

    const ref = user.profilePhotoUrl;
    if (!ref) {
      return NextResponse.json({ error: "No photo" }, { status: 404 });
    }

    if (ref.startsWith("storage:")) {
      const key = ref.slice("storage:".length);
      const bytes = await retrieveProfilePhotoBytes(key);
      const contentType = key.endsWith(".png")
        ? "image/png"
        : key.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    return NextResponse.redirect(ref);
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

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AdminRoleProtectedError,
  getUser,
  InvalidUserHierarchyError,
  retrieveProfilePhotoBytes,
  UserNotFoundError,
} from "@/modules/users";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const current = await getCurrentUser();
  if (!current || !hasPermission(current.authContext, "user.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const user = await getUser(id, {
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

    // Legacy absolute URL stored before storage keys.
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

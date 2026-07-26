import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission, hasRole } from "@/modules/rbac";
import { AdminRoleProtectedError, exportUsers } from "@/modules/users";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current || !hasPermission(current.authContext, "user.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = hasRole(current.authContext, "Admin");
  const isManager = current.authContext.hierarchy.primaryRole === "Manager";
  if (!isAdmin && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "excel" ? "excel" : "csv";

  try {
    const file = await exportUsers({
      actorRoles: current.authContext.roles.map((role) => role.name),
      hierarchy: current.authContext.hierarchy,
      format,
    });
    const body =
      typeof file.body === "string" ? file.body : new Uint8Array(file.body);
    return new NextResponse(body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AdminRoleProtectedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

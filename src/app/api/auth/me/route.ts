// ============================================================================
// Current-user RBAC snapshot for clients (web shell parity / mobile navigation).
// Reuses getCurrentUser + the same AuthorizationContext resolution as Server Components.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { isCallerWorkspaceUser, isInternalStaff } from "@/modules/rbac";
import { getUser } from "@/modules/users";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  const { session, authContext } = current;

  // Self profile fields for mobile (additive — web ignores extra keys).
  const profile = await getUser(session.user.id);

  return NextResponse.json({
    data: {
      user: {
        id: session.user.id,
        email: session.user.email ?? "",
        fullName: session.user.fullName,
        organizationId: session.user.organizationId,
        mustChangePassword: !!session.user.mustChangePassword,
        sessionId: session.user.sessionId ?? "",
        phone: profile.phone,
        profilePhotoUrl: profile.profilePhotoUrl,
      },
      roles: authContext.roles.map((role) => ({ id: role.id, name: role.name })),
      permissions: Object.keys(authContext.permissions),
      hierarchy: {
        primaryRole: authContext.hierarchy.primaryRole,
        unrestricted: authContext.hierarchy.unrestricted,
      },
      isStaff: isInternalStaff(authContext),
      isCallerWorkspace: isCallerWorkspaceUser(authContext),
    },
  });
}

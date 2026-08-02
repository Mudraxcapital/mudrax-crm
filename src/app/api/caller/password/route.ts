// ============================================================================
// Self-service password change for mobile callers (wraps changeOwnPassword).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { clientIpFromForwarded } from "@/infra/auth/clientIp";
import {
  changeOwnPassword,
  changeOwnPasswordSchema,
  InvalidUserHierarchyError,
} from "@/modules/users";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  const body = await request.json().catch(() => null);
  const parsed = changeOwnPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const forwarded = request.headers.get("x-forwarded-for");

  try {
    await changeOwnPassword({
      userId: current.session.user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      ipAddress: clientIpFromForwarded(forwarded),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidUserHierarchyError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  ApplicationNotApprovedError,
  CommissionPolicyMissingError,
  DuplicateBankReferenceError,
  listDisbursements,
  recordDisbursement,
  recordDisbursementSchema,
} from "@/modules/disbursements";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(current.authContext, "disbursement.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await listDisbursements(current.authContext.organizationId);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(current.authContext, "disbursement.record")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = recordDisbursementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const data = await recordDisbursement({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (
      error instanceof ApplicationNotApprovedError ||
      error instanceof CommissionPolicyMissingError ||
      error instanceof DuplicateBankReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

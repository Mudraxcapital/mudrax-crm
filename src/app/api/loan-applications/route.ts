import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createLoanApplication,
  createLoanApplicationSchema,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  InvalidLoanProductReferenceError,
  listLoanApplications,
} from "@/modules/loan-applications";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(current.authContext, "loan_application.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await listLoanApplications(current.authContext.organizationId);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(current.authContext, "loan_application.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createLoanApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const data = await createLoanApplication({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidLoanProductReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

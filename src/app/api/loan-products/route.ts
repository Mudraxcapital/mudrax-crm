import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  createLoanProduct,
  createLoanProductSchema,
  DuplicateLoanProductError,
  InvalidBankReferenceError,
  listLoanProducts,
} from "@/modules/loan-products";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "loan_product.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await listLoanProducts(current.authContext.organizationId);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "loan_product.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createLoanProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const data = await createLoanProduct({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateLoanProductError || error instanceof InvalidBankReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  createLoanApplication,
  createLoanApplicationSchema,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  InvalidLoanProductReferenceError,
  listLoanApplications,
} from "@/modules/loan-applications";
import {
  filterLoanAppsByVisibility,
  resolveVisibleOwnerIds,
} from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "loan_application.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const visibility = await resolveVisibleOwnerIds(current.authContext);
  const data = filterLoanAppsByVisibility(
    await listLoanApplications(current.authContext.organizationId),
    visibility,
  );
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

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
    const visibility = await resolveVisibleOwnerIds(current.authContext);
    if (!visibility.unrestricted) {
      const customerOk = visibility.customerIds?.has(parsed.data.customerId);
      const leadOk = parsed.data.leadId
        ? visibility.leadIds?.has(parsed.data.leadId)
        : true;
      if (!customerOk || !leadOk) {
        return NextResponse.json(
          { error: "Customer or Lead not found or access denied." },
          { status: 404 },
        );
      }
    }

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

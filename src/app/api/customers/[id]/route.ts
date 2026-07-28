// ============================================================================
// src/app/api/customers/[id]/route.ts
//
// Customer API — GET (read one, requires `customer.view`) and PATCH (update,
// requires `customer.update`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CustomerNotFoundError,
  getCustomer,
  updateCustomer,
  updateCustomerSchema,
} from "@/modules/customers";
import {
  canAccessCustomer,
  CustomerAccessDeniedError,
} from "@/shared/auth/assertCanAccessCustomer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "customer.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const customer = await getCustomer(id);
    if (!(await canAccessCustomer(current.authContext, customer))) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ data: customer });
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "customer.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const existing = await getCustomer(id);
    if (!(await canAccessCustomer(current.authContext, existing))) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const customer = await updateCustomer({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: customer });
  } catch (error) {
    if (error instanceof CustomerNotFoundError || error instanceof CustomerAccessDeniedError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    throw error;
  }
}

// ============================================================================
// src/app/api/customers/route.ts
//
// Customer API — GET (list, requires `customer.view`) and POST (create,
// requires `customer.create`). `organizationId` always comes from the acting
// User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  createCustomer,
  createCustomerSchema,
  DuplicateCustomerIdentifierError,
  listCustomers,
} from "@/modules/customers";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "customer.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  const customers = await listCustomers(current.authContext.organizationId, { search });
  return NextResponse.json({ data: customers });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "customer.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const customer = await createCustomer({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateCustomerIdentifierError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

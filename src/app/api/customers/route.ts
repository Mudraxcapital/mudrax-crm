// ============================================================================
// src/app/api/customers/route.ts
//
// Customer API — GET (list, requires `customer.view`) and POST (create,
// requires `customer.create`). `organizationId` always comes from the acting
// User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission, resolveOwnerManagerId } from "@/modules/rbac";
import {
  createCustomer,
  createCustomerSchema,
  DuplicateCustomerIdentifierError,
  listCustomers,
} from "@/modules/customers";
import { resolveCustomerListOptions } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "customer.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  const listOptions = await resolveCustomerListOptions(current.authContext, { search });
  const customers = await listCustomers(current.authContext.organizationId, listOptions);
  return NextResponse.json({ data: customers });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
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
      ownerManagerId: resolveOwnerManagerId(current.authContext),
    });
    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateCustomerIdentifierError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

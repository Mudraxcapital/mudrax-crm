// ============================================================================
// Shared Customer ownership gate — pages and API routes must apply the same
// hierarchy checks as customer list filters.
// ============================================================================

import {
  assertOwnsManagerData,
  type AuthorizationContext,
} from "@/modules/rbac";
import type { CustomerDto } from "@/modules/customers";
import { teamLeadCustomerLeadFilter } from "./applyHierarchyListFilter";
import { listDistinctCustomerIds } from "@/modules/leads";

export async function canAccessCustomer(
  authContext: AuthorizationContext,
  customer: Pick<CustomerDto, "id" | "organizationId" | "ownerManagerId">,
): Promise<boolean> {
  if (customer.organizationId !== authContext.organizationId) {
    return false;
  }

  if (authContext.hierarchy.unrestricted || authContext.hierarchy.primaryRole === "Admin") {
    return true;
  }

  const teamFilter = teamLeadCustomerLeadFilter(authContext);
  if (teamFilter) {
    const visibleIds = await listDistinctCustomerIds(authContext.organizationId, teamFilter);
    return visibleIds.includes(customer.id);
  }

  return assertOwnsManagerData(authContext.hierarchy, customer.ownerManagerId);
}

export async function assertCanAccessCustomer(
  authContext: AuthorizationContext,
  customer: Pick<CustomerDto, "id" | "organizationId" | "ownerManagerId">,
): Promise<void> {
  if (!(await canAccessCustomer(authContext, customer))) {
    throw new CustomerAccessDeniedError();
  }
}

export class CustomerAccessDeniedError extends Error {
  constructor(message = "Customer not found or access denied.") {
    super(message);
    this.name = "CustomerAccessDeniedError";
  }
}

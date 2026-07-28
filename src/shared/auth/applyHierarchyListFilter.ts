// ============================================================================
// Shared presentation helper — merges HierarchyScope into module list filters.
// ============================================================================

import {
  canViewUserId,
  getPermissionScope,
  ownershipFilterFromHierarchy,
  type AuthorizationContext,
  type OwnershipQueryFilter,
} from "@/modules/rbac";
import type { ListLeadsFilter } from "@/modules/leads/domain/repositories/LeadRepository";
import type { ListCustomersOptions } from "@/modules/customers/domain/repositories/CustomerRepository";
import { listDistinctCustomerIds, listLeads } from "@/modules/leads";
import { listCustomers } from "@/modules/customers";

/** Campaign / customer list filter (manager book only). */
export function managerBookFilter(authContext: AuthorizationContext): { ownerManagerId?: string } {
  const ownership = ownershipFilterFromHierarchy(authContext.hierarchy, { forAssignees: false });
  return ownership.ownerManagerId ? { ownerManagerId: ownership.ownerManagerId } : {};
}

/** Lead list filter — manager book + team lead + assignee SELF as needed. */
export function leadHierarchyFilter(authContext: AuthorizationContext): OwnershipQueryFilter {
  const hierarchy = authContext.hierarchy;
  if (hierarchy.primaryRole === "Caller") {
    return ownershipFilterFromHierarchy(hierarchy);
  }
  if (hierarchy.primaryRole === "Team Lead") {
    // Team Lead sees leads they own (ownerTeamLeadId) under their Manager book.
    return {
      ownerManagerId: hierarchy.ownerManagerId ?? undefined,
      ownerTeamLeadId: hierarchy.teamLeadId ?? undefined,
    };
  }
  return ownershipFilterFromHierarchy(hierarchy, { forAssignees: false });
}

/**
 * Hierarchy + permission Data Scope for Lead list / export / import / pipeline.
 * Matches All Leads page visibility (Admin/Manager/Team Lead books; SELF → assignee).
 */
export function visibleLeadsFilter(
  authContext: AuthorizationContext,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
    /** Optional assignee filter from the UI (ignored when scope is SELF). */
    assignedToUserId?: string;
  },
): OwnershipQueryFilter {
  const permissionCode = options?.permissionCode ?? "lead.view";
  const scope = getPermissionScope(authContext, permissionCode);
  const hierarchyFilter = leadHierarchyFilter(authContext);
  const actorUserId = options?.actorUserId ?? authContext.userId;

  if (scope === "SELF" || hierarchyFilter.assignedToUserIds) {
    return {
      ...hierarchyFilter,
      assignedToUserIds: hierarchyFilter.assignedToUserIds ?? [actorUserId],
    };
  }

  if (options?.assignedToUserId) {
    return {
      ...hierarchyFilter,
      assignedToUserIds: [options.assignedToUserId],
    };
  }

  return hierarchyFilter;
}

/** Call / agent filter. */
export function agentHierarchyFilter(authContext: AuthorizationContext): {
  agentUserId?: string;
  agentUserIds?: string[];
} {
  const hierarchy = authContext.hierarchy;
  if (hierarchy.primaryRole === "Caller") {
    return { agentUserId: authContext.userId };
  }
  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") {
    return {};
  }
  // Manager / Team Lead — restrict to agents in the visible hierarchy tree.
  if (hierarchy.visibleUserIds?.length) {
    return { agentUserIds: hierarchy.visibleUserIds };
  }
  return { agentUserId: authContext.userId };
}

/**
 * Follow-up list filter — single source of truth for `/follow-ups`, Calendar,
 * and `/api/follow-ups`. Follow-ups have no ownerManagerId column; visibility
 * is enforced via current assignee against hierarchy + permission Data Scope.
 */
export function followUpListFilter(
  authContext: AuthorizationContext,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): { assignedToUserIds?: string[] } {
  const permissionCode = options?.permissionCode ?? "follow_up.view";
  const scope = getPermissionScope(authContext, permissionCode);
  const actorUserId = options?.actorUserId ?? authContext.userId;
  const hierarchy = authContext.hierarchy;

  if (scope === "SELF" || hierarchy.primaryRole === "Caller") {
    return { assignedToUserIds: [actorUserId] };
  }

  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") {
    return {};
  }

  if (hierarchy.visibleUserIds?.length) {
    return { assignedToUserIds: hierarchy.visibleUserIds };
  }

  return {};
}

/** Report / analytics filter fragment from hierarchy. */
export function reportHierarchyFilter(authContext: AuthorizationContext): {
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  agentUserIds?: string[] | null;
} {
  const ownership = ownershipFilterFromHierarchy(authContext.hierarchy, { forAssignees: false });
  if (authContext.hierarchy.unrestricted) {
    return {};
  }
  return {
    ownerManagerId: ownership.ownerManagerId ?? null,
    ownerTeamLeadId:
      authContext.hierarchy.primaryRole === "Team Lead"
        ? (authContext.hierarchy.teamLeadId ?? null)
        : null,
    agentUserIds: authContext.hierarchy.visibleUserIds,
  };
}

/**
 * Merge caller-supplied report filters with hierarchy scope.
 * Hierarchy ownership / agent ids always win — callers cannot escalate scope.
 * Optional userId is kept only when visible in the actor hierarchy.
 */
export function mergeReportHierarchyFilter(
  authContext: AuthorizationContext,
  filter?: {
    dateFrom?: string | null;
    dateTo?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    userId?: string | null;
  } | null,
): {
  dateFrom: string | null;
  dateTo: string | null;
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  userId: string | null;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  agentUserIds?: string[] | null;
} {
  const hierarchy = reportHierarchyFilter(authContext);
  const requestedUserId = filter?.userId?.trim() || null;
  const safeUserId =
    requestedUserId && canViewUserId(authContext.hierarchy, requestedUserId)
      ? requestedUserId
      : null;

  return {
    dateFrom: filter?.dateFrom ?? null,
    dateTo: filter?.dateTo ?? null,
    branchId: filter?.branchId ?? null,
    departmentId: filter?.departmentId ?? null,
    teamId: filter?.teamId ?? null,
    userId: safeUserId,
    ...hierarchy,
  };
}

/**
 * Team Lead customer visibility via Leads:
 * - Customers for leads owned by the Team Lead, OR
 * - Customers for campaign leads assigned to callers under the Team Lead.
 */
export function teamLeadCustomerLeadFilter(
  authContext: AuthorizationContext,
): ListLeadsFilter | null {
  const hierarchy = authContext.hierarchy;
  if (hierarchy.primaryRole !== "Team Lead") return null;
  const teamLeadId = hierarchy.teamLeadId;
  if (!teamLeadId) return null;
  return {
    ownerManagerId: hierarchy.ownerManagerId ?? undefined,
    teamLeadCustomerScope: {
      teamLeadId,
      callerUserIds: hierarchy.visibleUserIds?.length
        ? hierarchy.visibleUserIds
        : [teamLeadId],
    },
  };
}

/** Customer list/count filter — Manager book or Team Lead lead-derived customer ids. */
export async function resolveCustomerListOptions(
  authContext: AuthorizationContext,
  options?: Omit<ListCustomersOptions, "customerIds" | "ownerManagerId">,
): Promise<ListCustomersOptions> {
  const teamFilter = teamLeadCustomerLeadFilter(authContext);
  if (teamFilter) {
    const customerIds = await listDistinctCustomerIds(authContext.organizationId, teamFilter);
    return { ...options, customerIds };
  }
  return { ...options, ...managerBookFilter(authContext) };
}

/**
 * Visible Customer + Lead id sets for modules that lack native ownership columns
 * (documents, loan applications, search post-filters).
 * `unrestricted: true` → skip filtering (Admin).
 */
export async function resolveVisibleOwnerIds(authContext: AuthorizationContext): Promise<{
  unrestricted: boolean;
  customerIds: Set<string> | null;
  leadIds: Set<string> | null;
}> {
  const hierarchy = authContext.hierarchy;
  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") {
    return { unrestricted: true, customerIds: null, leadIds: null };
  }

  const leadFilter = visibleLeadsFilter(authContext, {
    permissionCode: "lead.view",
    actorUserId: authContext.userId,
  });
  const customerOptions = await resolveCustomerListOptions(authContext, { limit: 50_000 });

  const [leads, customers] = await Promise.all([
    listLeads(authContext.organizationId, { ...leadFilter, limit: 50_000 }),
    listCustomers(authContext.organizationId, customerOptions),
  ]);

  return {
    unrestricted: false,
    customerIds: new Set(customers.map((customer) => customer.id)),
    leadIds: new Set(leads.map((lead) => lead.id)),
  };
}

/** Filter document rows to owners the actor may see. */
export function filterDocumentsByOwnerVisibility<
  T extends { ownerType: string; ownerId: string },
>(
  documents: T[],
  visibility: { unrestricted: boolean; customerIds: Set<string> | null; leadIds: Set<string> | null },
): T[] {
  if (visibility.unrestricted) return documents;
  const customerIds = visibility.customerIds ?? new Set<string>();
  const leadIds = visibility.leadIds ?? new Set<string>();
  return documents.filter((doc) => {
    if (doc.ownerType === "CUSTOMER") return customerIds.has(doc.ownerId);
    if (doc.ownerType === "LEAD") return leadIds.has(doc.ownerId);
    return false;
  });
}

/** Filter loan applications to customers/leads the actor may see. */
export function filterLoanAppsByVisibility<
  T extends { customerId: string; leadId?: string | null },
>(
  apps: T[],
  visibility: { unrestricted: boolean; customerIds: Set<string> | null; leadIds: Set<string> | null },
): T[] {
  if (visibility.unrestricted) return apps;
  const customerIds = visibility.customerIds ?? new Set<string>();
  const leadIds = visibility.leadIds ?? new Set<string>();
  return apps.filter((app) => {
    if (customerIds.has(app.customerId)) return true;
    if (app.leadId && leadIds.has(app.leadId)) return true;
    return false;
  });
}

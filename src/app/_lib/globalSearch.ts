// ============================================================================
// src/app/_lib/globalSearch.ts
//
// Presentation-layer composition: Global Search across Customers, Leads,
// Loan Applications, Documents, and Campaigns with fuzzy ranking.
// ============================================================================

import { rankByFuzzy } from "@/shared/search/fuzzy";
import { listCustomers } from "@/modules/customers";
import { listActiveLeadFields, listLeads } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { listDocuments } from "@/modules/documents";
import { listLoanApplications } from "@/modules/loan-applications";
import type { ListCustomersOptions } from "@/modules/customers/domain/repositories/CustomerRepository";
import type { OwnershipQueryFilter } from "@/modules/rbac";
import {
  filterDocumentsByOwnerVisibility,
  filterLoanAppsByVisibility,
  resolveVisibleOwnerIds,
} from "@/shared/auth/applyHierarchyListFilter";
import type { AuthorizationContext } from "@/modules/rbac";

export type GlobalSearchEntity =
  | "customer"
  | "lead"
  | "loan_application"
  | "document"
  | "campaign";

export interface GlobalSearchHit {
  entity: GlobalSearchEntity;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

export interface GlobalSearchOptions {
  includeCustomers?: boolean;
  includeLeads?: boolean;
  includeLoanApplications?: boolean;
  includeDocuments?: boolean;
  includeCampaigns?: boolean;
  /** When set, lead results are restricted to this assignee (Caller Workspace). */
  assignedToUserId?: string;
  /** Lead detail path prefix — `/caller/leads` for Caller Workspace. */
  leadHrefPrefix?: string;
  customerListOptions?: ListCustomersOptions;
  leadListFilter?: OwnershipQueryFilter;
  campaignListFilter?: { ownerManagerId?: string };
  /** When provided, documents/loans are hierarchy-filtered. */
  authContext?: AuthorizationContext;
  limit?: number;
}

export async function globalSearch(
  organizationId: string,
  query: string,
  options: GlobalSearchOptions = {},
): Promise<GlobalSearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const {
    includeCustomers = true,
    includeLeads = true,
    includeLoanApplications = true,
    includeDocuments = true,
    includeCampaigns = true,
    assignedToUserId,
    leadHrefPrefix = "/leads",
    customerListOptions,
    leadListFilter,
    campaignListFilter,
    authContext,
    limit = 25,
  } = options;

  const searchableCustomKeys = includeLeads
    ? (await listActiveLeadFields(organizationId))
        .filter((field) => field.isSearchable)
        .map((field) => field.internalKey)
        .filter((key) => key !== "full_name" && key !== "phone" && key !== "email")
    : [];

  const visibility = authContext ? await resolveVisibleOwnerIds(authContext) : null;

  const [customers, leads, campaigns, documentsRaw, loanAppsRaw] = await Promise.all([
    includeCustomers
      ? listCustomers(organizationId, {
          search: q,
          limit: 50,
          ...customerListOptions,
        })
      : Promise.resolve([]),
    includeLeads
      ? listLeads(organizationId, {
          search: q,
          limit: 50,
          searchableCustomKeys,
          assignedToUserIds: assignedToUserId
            ? [assignedToUserId]
            : leadListFilter?.assignedToUserIds,
          ownerManagerId: leadListFilter?.ownerManagerId,
          ownerTeamLeadId: leadListFilter?.ownerTeamLeadId,
        })
      : Promise.resolve([]),
    includeCampaigns
      ? listCampaigns(organizationId, campaignListFilter)
      : Promise.resolve([]),
    includeDocuments ? listDocuments(organizationId, { limit: 50 }) : Promise.resolve([]),
    includeLoanApplications
      ? listLoanApplications(organizationId, { limit: 50 })
      : Promise.resolve([]),
  ]);

  const documents = visibility
    ? filterDocumentsByOwnerVisibility(documentsRaw, visibility)
    : documentsRaw;
  const loanApps = visibility
    ? filterLoanAppsByVisibility(loanAppsRaw, visibility)
    : loanAppsRaw;

  const hits: GlobalSearchHit[] = [];

  for (const { item, score } of rankByFuzzy(q, customers, (c) => c.fullName, 0.2)) {
    hits.push({
      entity: "customer",
      id: item.id,
      title: item.fullName,
      subtitle: `Customer · ${item.status}`,
      href: `/customers/${item.id}`,
      score,
    });
  }

  for (const { item, score } of rankByFuzzy(
    q,
    leads,
    (lead) => `${lead.fullNameSnapshot} ${lead.phoneSnapshot ?? ""} ${lead.emailSnapshot ?? ""}`,
    0.2,
  )) {
    hits.push({
      entity: "lead",
      id: item.id,
      title: item.fullNameSnapshot,
      subtitle: `Lead · ${item.currentStageName}`,
      href: `${leadHrefPrefix}/${item.id}`,
      score,
    });
  }

  for (const { item, score } of rankByFuzzy(q, campaigns, (c) => `${c.name} ${c.description ?? ""}`, 0.2)) {
    hits.push({
      entity: "campaign",
      id: item.id,
      title: item.name,
      subtitle: `Campaign · ${item.status}`,
      href: `/campaigns/${item.id}`,
      score,
    });
  }

  for (const { item, score } of rankByFuzzy(
    q,
    documents,
    (doc) => `${doc.documentTypeName ?? ""} ${doc.categoryName ?? ""} ${doc.id}`,
    0.2,
  )) {
    hits.push({
      entity: "document",
      id: item.id,
      title: item.documentTypeName ?? "Document",
      subtitle: `Document · ${item.status}`,
      href: `/documents/library/${item.id}`,
      score,
    });
  }

  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.fullName]));
  for (const { item, score } of rankByFuzzy(
    q,
    loanApps,
    (app) =>
      `${customerNameById.get(app.customerId) ?? ""} ${app.applicationStatusName ?? ""} ${app.applicationStatusBucket ?? ""} ${app.id}`,
    0.15,
  )) {
    const customerName = customerNameById.get(item.customerId) ?? "Customer";
    hits.push({
      entity: "loan_application",
      id: item.id,
      title: customerName,
      subtitle: `Loan Application · ${item.applicationStatusName ?? item.applicationStatusBucket ?? "—"}`,
      href: `/loan-applications/${item.id}`,
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

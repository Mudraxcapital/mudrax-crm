// ============================================================================
// src/app/_lib/globalSearch.ts
//
// Presentation-layer composition: Global Search across Customers, Leads,
// Loan Applications, Documents, and Campaigns with fuzzy ranking.
// ============================================================================

import { rankByFuzzy } from "@/shared/search/fuzzy";
import { listCustomers } from "@/modules/customers";
import { listLeads } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { listDocuments } from "@/modules/documents";
import { listLoanApplications } from "@/modules/loan-applications";

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
    limit = 25,
  } = options;

  const [customers, leads, campaigns, documents, loanApps] = await Promise.all([
    includeCustomers
      ? listCustomers(organizationId, { search: q, limit: 50 })
      : Promise.resolve([]),
    includeLeads ? listLeads(organizationId, { search: q, limit: 50 }) : Promise.resolve([]),
    includeCampaigns ? listCampaigns(organizationId) : Promise.resolve([]),
    includeDocuments ? listDocuments(organizationId, { limit: 50 }) : Promise.resolve([]),
    includeLoanApplications
      ? listLoanApplications(organizationId, { limit: 50 })
      : Promise.resolve([]),
  ]);

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
      href: `/leads/${item.id}`,
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
      href: `/documents/${item.id}`,
      score,
    });
  }

  for (const { item, score } of rankByFuzzy(
    q,
    loanApps,
    (app) =>
      `${app.id} ${app.customerId} ${app.applicationStatusName ?? ""} ${app.applicationStatusBucket ?? ""}`,
    0.15,
  )) {
    hits.push({
      entity: "loan_application",
      id: item.id,
      title: `Application ${item.id.slice(0, 8)}`,
      subtitle: `Loan Application · ${item.applicationStatusName ?? item.applicationStatusBucket ?? "—"}`,
      href: `/loan-applications/${item.id}`,
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

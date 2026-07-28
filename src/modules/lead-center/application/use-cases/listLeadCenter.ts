// ============================================================================
// src/modules/lead-center/application/use-cases/listLeadCenter.ts
// ============================================================================

import type { LeadCenterRepository } from "../../domain/repositories/LeadCenterRepository";
import type { ListStagedLeadsFilter } from "../../domain/repositories/LeadCenterRepository";
import type { StagedLead } from "../../domain/entities/StagedLead";
import type { LeadCenterSourceBucket } from "../../domain/entities/IngestionBatch";
import { makeEnsureLeadCenterSources } from "./ingestLeads";
import {
  LEAD_CENTER_SOURCE_CODES,
  LEAD_CENTER_SOURCE_LABELS,
  type LeadCenterSourceCode,
} from "../../catalog";

export interface LeadCenterBucketSummary {
  code: string;
  name: string;
  pendingCount: number;
  totalCount: number;
  isActive: boolean;
}

export interface LeadCenterDashboard {
  buckets: LeadCenterBucketSummary[];
  recentLeads: StagedLead[];
  totalPending: number;
}

export function makeListLeadCenterDashboard(repository: LeadCenterRepository) {
  const ensureSources = makeEnsureLeadCenterSources(repository);

  return async function listLeadCenterDashboard(
    organizationId: string,
    filter?: ListStagedLeadsFilter,
  ): Promise<LeadCenterDashboard> {
    const buckets = await ensureSources(organizationId);
    const productCodes = [...LEAD_CENTER_SOURCE_CODES];
    const productCodeSet = new Set<string>(productCodes);
    const [counts, recentLeads] = await Promise.all([
      repository.countBySource(organizationId, filter),
      repository.listStagedLeads(organizationId, {
        ...filter,
        sourceCodes: productCodes,
        limit: filter?.limit ?? 25,
        offset: filter?.offset ?? 0,
      }),
    ]);

    const countByCode = new Map(counts.map((c) => [c.sourceCode, c]));
    const summaries: LeadCenterBucketSummary[] = buckets
      .filter((bucket) => productCodeSet.has(bucket.code))
      .map((bucket: LeadCenterSourceBucket) => {
        const stats = countByCode.get(bucket.code);
        return {
          code: bucket.code,
          name:
            bucket.name ||
            LEAD_CENTER_SOURCE_LABELS[bucket.code as LeadCenterSourceCode] ||
            bucket.code,
          pendingCount: stats?.pendingCount ?? 0,
          totalCount: stats?.totalCount ?? 0,
          isActive: bucket.isActive,
        };
      });

    return {
      buckets: summaries,
      recentLeads,
      totalPending: summaries.reduce((sum, b) => sum + b.pendingCount, 0),
    };
  };
}

export function makeListStagedLeads(repository: LeadCenterRepository) {
  return async function listStagedLeads(organizationId: string, filter?: ListStagedLeadsFilter) {
    return repository.listStagedLeads(organizationId, filter);
  };
}

export function makeCountStagedLeads(repository: LeadCenterRepository) {
  return async function countStagedLeads(organizationId: string, filter?: ListStagedLeadsFilter) {
    return repository.countStagedLeads(organizationId, filter);
  };
}

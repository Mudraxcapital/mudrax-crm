// ============================================================================
// src/modules/lead-center/__tests__/fakeLeadCenterRepository.ts
// ============================================================================

import type {
  CreateIngestionBatchData,
  CreateStagedLeadData,
  LeadCenterRepository,
  ListStagedLeadsFilter,
  SourceBucketCount,
  UpdateIngestionBatchCountsData,
  UpdateStagedLeadPatch,
} from "../domain/repositories/LeadCenterRepository";
import type { IngestionBatch, LeadCenterSourceBucket } from "../domain/entities/IngestionBatch";
import type { StagedLead } from "../domain/entities/StagedLead";
import type { LeadCenterAuditActor } from "../domain/entities/LeadCenterAuditRecord";

let nextId = 1;
function makeId(): string {
  return `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`;
}

export class FakeLeadCenterRepository implements LeadCenterRepository {
  buckets = new Map<string, LeadCenterSourceBucket>();
  batches = new Map<string, IngestionBatch>();
  staged = new Map<string, StagedLead>();
  audits: Array<{ action: string; targetId: string }> = [];

  async ensureSourceBuckets(
    organizationId: string,
    buckets: Array<{ code: string; name: string; sortOrder: number }>,
  ): Promise<LeadCenterSourceBucket[]> {
    for (const bucket of buckets) {
      const key = `${organizationId}:${bucket.code}`;
      const existing = this.buckets.get(key);
      if (existing) {
        existing.name = bucket.name;
        existing.sortOrder = bucket.sortOrder;
        existing.isActive = true;
        existing.updatedAt = new Date();
      } else {
        const now = new Date();
        this.buckets.set(key, {
          id: makeId(),
          organizationId,
          code: bucket.code,
          name: bucket.name,
          isActive: true,
          sortOrder: bucket.sortOrder,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    return this.listSourceBuckets(organizationId);
  }

  async findSourceBucketByCode(organizationId: string, code: string) {
    return this.buckets.get(`${organizationId}:${code}`) ?? null;
  }

  async listSourceBuckets(organizationId: string) {
    return [...this.buckets.values()]
      .filter((b) => b.organizationId === organizationId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async countBySource(
    organizationId: string,
    filter?: ListStagedLeadsFilter,
  ): Promise<SourceBucketCount[]> {
    const leads = await this.listStagedLeads(organizationId, { ...filter, limit: 10_000 });
    const map = new Map<string, SourceBucketCount>();
    for (const lead of leads) {
      const entry = map.get(lead.sourceCode) ?? {
        sourceCode: lead.sourceCode,
        pendingCount: 0,
        totalCount: 0,
      };
      entry.totalCount += 1;
      if (
        lead.status !== "IMPORTED" &&
        lead.status !== "ARCHIVED" &&
        lead.status !== "DELETED" &&
        lead.importStatus !== "IMPORTED"
      ) {
        entry.pendingCount += 1;
      }
      map.set(lead.sourceCode, entry);
    }
    return [...map.values()];
  }

  async createIngestionBatch(data: CreateIngestionBatchData): Promise<IngestionBatch> {
    const batch: IngestionBatch = {
      id: makeId(),
      organizationId: data.organizationId,
      sourceBucketId: data.sourceBucketId,
      sourceCode: data.sourceCode,
      receivedByUserId: data.receivedByUserId ?? null,
      sourceFileName: data.sourceFileName ?? null,
      connectorRef: data.connectorRef ?? null,
      status: "RECEIVED",
      totalCount: 0,
      storedCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      ownerManagerId: data.ownerManagerId ?? null,
      ownerTeamLeadId: data.ownerTeamLeadId ?? null,
      meta: data.meta ?? null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.batches.set(batch.id, batch);
    return batch;
  }

  async updateIngestionBatch(id: string, data: UpdateIngestionBatchCountsData) {
    const batch = this.batches.get(id);
    if (!batch) throw new Error(`batch ${id} missing`);
    Object.assign(batch, data);
    return batch;
  }

  async findIngestionBatchById(id: string) {
    return this.batches.get(id) ?? null;
  }

  async createStagedLeads(rows: CreateStagedLeadData[]): Promise<StagedLead[]> {
    const created: StagedLead[] = [];
    const now = new Date();
    for (const row of rows) {
      const lead: StagedLead = {
        id: makeId(),
        organizationId: row.organizationId,
        ingestionBatchId: row.ingestionBatchId ?? null,
        sourceBucketId: row.sourceBucketId,
        sourceCode: row.sourceCode,
        fullName: row.fullName,
        phone: row.phone ?? null,
        email: row.email ?? null,
        campaignNameHint: row.campaignNameHint ?? null,
        rawPayload: row.rawPayload,
        normalizedPayload: row.normalizedPayload ?? null,
        status: row.status ?? "PENDING_REVIEW",
        duplicateStatus: row.duplicateStatus ?? "UNKNOWN",
        validationStatus: row.validationStatus ?? "PENDING",
        importStatus: row.importStatus ?? "NOT_IMPORTED",
        matchReason: row.matchReason ?? null,
        matchedLeadId: row.matchedLeadId ?? null,
        matchedCustomerId: row.matchedCustomerId ?? null,
        validationErrors: row.validationErrors ?? null,
        tags: row.tags ?? [],
        branchId: row.branchId ?? null,
        assignedManagerUserId: row.assignedManagerUserId ?? null,
        ownerManagerId: row.ownerManagerId ?? null,
        ownerTeamLeadId: row.ownerTeamLeadId ?? null,
        importedLeadId: null,
        importedCampaignId: null,
        importedAt: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.staged.set(lead.id, lead);
      created.push(lead);
    }
    return created;
  }

  async findStagedLeadById(id: string) {
    return this.staged.get(id) ?? null;
  }

  async findStagedLeadsByIds(organizationId: string, ids: string[]) {
    return ids
      .map((id) => this.staged.get(id))
      .filter((lead): lead is StagedLead => Boolean(lead && lead.organizationId === organizationId));
  }

  async updateStagedLeads(organizationId: string, ids: string[], patch: UpdateStagedLeadPatch) {
    let updated = 0;
    for (const id of ids) {
      const lead = this.staged.get(id);
      if (!lead || lead.organizationId !== organizationId) continue;
      Object.assign(lead, patch);
      lead.updatedAt = new Date();
      updated += 1;
    }
    return updated;
  }

  async listStagedLeads(organizationId: string, filter?: ListStagedLeadsFilter) {
    let results = [...this.staged.values()].filter((l) => l.organizationId === organizationId);
    if (filter?.sourceCodes && filter.sourceCodes.length > 0) {
      const allowed = new Set(filter.sourceCodes);
      results = results.filter((l) => allowed.has(l.sourceCode));
    } else if (filter?.sourceCode) {
      results = results.filter((l) => l.sourceCode === filter.sourceCode);
    }
    if (filter?.status) results = results.filter((l) => l.status === filter.status);
    if (filter?.duplicateStatus) {
      results = results.filter((l) => l.duplicateStatus === filter.duplicateStatus);
    }
    if (filter?.ownerManagerId || filter?.ownerTeamLeadId) {
      results = results.filter((l) => {
        const unowned = l.ownerManagerId == null && l.ownerTeamLeadId == null;
        if (unowned) return true;
        if (filter.ownerManagerId && l.ownerManagerId !== filter.ownerManagerId) return false;
        if (filter.ownerTeamLeadId && l.ownerTeamLeadId !== filter.ownerTeamLeadId) return false;
        return true;
      });
    }
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  async countStagedLeads(organizationId: string, filter?: ListStagedLeadsFilter) {
    const rows = await this.listStagedLeads(organizationId, { ...filter, limit: 100_000, offset: 0 });
    return rows.length;
  }

  async appendAudit(input: {
    organizationId: string;
    actor: LeadCenterAuditActor;
    action: string;
    targetType: string;
    targetId: string;
  }): Promise<void> {
    this.audits.push({ action: input.action, targetId: input.targetId });
  }
}

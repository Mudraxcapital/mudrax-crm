// ============================================================================
// src/modules/lead-center/application/use-cases/ingestLeads.ts
//
// Shared Lead Ingestion Pipeline:
// Receive → Normalize → Validate → Duplicate Detection → Store in Lead Center
// ============================================================================

import type { LeadCenterRepository } from "../../domain/repositories/LeadCenterRepository";
import type { LeadCenterAuditActor } from "../../domain/entities/LeadCenterAuditRecord";
import type { IngestionBatch } from "../../domain/entities/IngestionBatch";
import type { StagedLead } from "../../domain/entities/StagedLead";
import { InvalidLeadCenterSourceError } from "../../domain/errors/LeadCenterErrors";
import type { ExistingLeadLookupPort } from "../ports/ExistingLeadLookupPort";
import type {
  ClassifyDuplicatesPort,
  DuplicateMatchMode,
} from "../ports/ClassifyDuplicatesPort";
import {
  normalizeInboundLeads,
  type RawInboundLead,
} from "../services/normalizeInboundLead";
import { validateNormalizedLeads } from "../services/validateNormalizedLead";
import {
  LEAD_CENTER_SOURCE_CODES,
  LEAD_CENTER_SOURCE_LABELS,
  type LeadCenterSourceCode,
} from "../../catalog";

export interface IngestLeadsCommand {
  organizationId: string;
  sourceCode: LeadCenterSourceCode;
  rawLeads: RawInboundLead[];
  actor: LeadCenterAuditActor;
  receivedByUserId?: string | null;
  sourceFileName?: string | null;
  connectorRef?: string | null;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  matchMode?: DuplicateMatchMode;
  correlationId?: string | null;
}

export interface IngestLeadsResult {
  batch: IngestionBatch;
  stagedLeads: StagedLead[];
  storedCount: number;
  duplicateCount: number;
  invalidCount: number;
}

function isSourceCode(value: string): value is LeadCenterSourceCode {
  return (LEAD_CENTER_SOURCE_CODES as readonly string[]).includes(value);
}

export function makeEnsureLeadCenterSources(repository: LeadCenterRepository) {
  return async function ensureLeadCenterSources(organizationId: string) {
    const buckets = LEAD_CENTER_SOURCE_CODES.map((code, index) => ({
      code,
      name: LEAD_CENTER_SOURCE_LABELS[code],
      sortOrder: index,
    }));
    return repository.ensureSourceBuckets(organizationId, buckets);
  };
}

export function makeIngestLeads(
  repository: LeadCenterRepository,
  existingLeadLookup: ExistingLeadLookupPort,
  classifyDuplicates: ClassifyDuplicatesPort,
) {
  const ensureSources = makeEnsureLeadCenterSources(repository);

  return async function ingestLeads(command: IngestLeadsCommand): Promise<IngestLeadsResult> {
    if (!isSourceCode(command.sourceCode)) {
      throw new InvalidLeadCenterSourceError(command.sourceCode);
    }

    await ensureSources(command.organizationId);
    const bucket = await repository.findSourceBucketByCode(
      command.organizationId,
      command.sourceCode,
    );
    if (!bucket || !bucket.isActive) {
      throw new InvalidLeadCenterSourceError(command.sourceCode);
    }

    const batch = await repository.createIngestionBatch({
      organizationId: command.organizationId,
      sourceBucketId: bucket.id,
      sourceCode: command.sourceCode,
      receivedByUserId: command.receivedByUserId,
      sourceFileName: command.sourceFileName,
      connectorRef: command.connectorRef,
      ownerManagerId: command.ownerManagerId,
      ownerTeamLeadId: command.ownerTeamLeadId,
      meta: { matchMode: command.matchMode ?? "phone_or_email" },
    });

    await repository.updateIngestionBatch(batch.id, { status: "PROCESSING" });

    try {
      const normalized = normalizeInboundLeads(command.rawLeads);
      const validated = validateNormalizedLeads(normalized);

      const matchMode = command.matchMode ?? "phone_or_email";
      const existing = await existingLeadLookup.listForDuplicateScan(command.organizationId, {
        ownerManagerId: command.ownerManagerId ?? undefined,
        ownerTeamLeadId: command.ownerTeamLeadId ?? undefined,
      });

      const duplicateSummary = classifyDuplicates.classify({
        rows: validated.map((row) => ({
          rowNumber: row.rowNumber,
          name: row.fullName,
          phone: row.phone,
          email: row.email,
        })),
        existingLeads: existing,
        matchMode,
      });

      const classByRow = new Map(
        [
          ...duplicateSummary.newLeads,
          ...duplicateSummary.possibleDuplicates,
          ...duplicateSummary.exactDuplicates,
        ].map((row) => [row.rowNumber, row]),
      );

      let duplicateCount = 0;
      let invalidCount = 0;

      const createRows = validated.map((row) => {
        const classification = classByRow.get(row.rowNumber);
        const isInvalid = row.validationStatus === "INVALID";
        if (isInvalid) invalidCount += 1;

        let duplicateStatus: StagedLead["duplicateStatus"] = "NONE";
        if (classification?.category === "exact") {
          duplicateStatus = "EXACT";
          duplicateCount += 1;
        } else if (classification?.category === "possible") {
          duplicateStatus = "POSSIBLE";
          duplicateCount += 1;
        }

        const status: StagedLead["status"] = isInvalid
          ? "VALIDATION"
          : duplicateStatus === "NONE"
            ? "PENDING_REVIEW"
            : "DUPLICATE_CHECK";

        return {
          organizationId: command.organizationId,
          ingestionBatchId: batch.id,
          sourceBucketId: bucket.id,
          sourceCode: command.sourceCode,
          fullName: row.fullName || "(unnamed)",
          phone: row.phone || null,
          email: row.email || null,
          campaignNameHint: row.campaignNameHint,
          rawPayload: row.rawPayload,
          normalizedPayload: row.normalizedPayload,
          status,
          duplicateStatus: isInvalid ? ("UNKNOWN" as const) : duplicateStatus,
          validationStatus: row.validationStatus,
          importStatus: "NOT_IMPORTED" as const,
          matchReason: classification?.matchReason ?? null,
          matchedLeadId: classification?.existingLeadId ?? null,
          matchedCustomerId: classification?.existingCustomerId ?? null,
          validationErrors: row.validationErrors.length > 0 ? row.validationErrors : null,
          tags: row.tags,
          ownerManagerId: command.ownerManagerId ?? null,
          ownerTeamLeadId: command.ownerTeamLeadId ?? null,
        };
      });

      const stagedLeads = await repository.createStagedLeads(createRows);

      const updated = await repository.updateIngestionBatch(batch.id, {
        status: "STORED",
        totalCount: createRows.length,
        storedCount: stagedLeads.length,
        duplicateCount,
        invalidCount,
        completedAt: new Date(),
      });

      await repository.appendAudit({
        organizationId: command.organizationId,
        actor: command.actor,
        action: "ingestion.stored",
        targetType: "IngestionBatch",
        targetId: batch.id,
        afterState: {
          sourceCode: command.sourceCode,
          totalCount: createRows.length,
          storedCount: stagedLeads.length,
          duplicateCount,
          invalidCount,
        },
        correlationId: command.correlationId,
      });

      return {
        batch: updated,
        stagedLeads,
        storedCount: stagedLeads.length,
        duplicateCount,
        invalidCount,
      };
    } catch (error) {
      await repository.updateIngestionBatch(batch.id, {
        status: "FAILED",
        completedAt: new Date(),
      });
      throw error;
    }
  };
}

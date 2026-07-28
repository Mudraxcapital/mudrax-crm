// ============================================================================
// src/modules/lead-center/application/use-cases/bulkStagedLeadOperations.ts
// ============================================================================

import { renderCsv } from "@/shared/csv/csv";
import type { LeadCenterRepository } from "../../domain/repositories/LeadCenterRepository";
import type { LeadCenterAuditActor } from "../../domain/entities/LeadCenterAuditRecord";
import type { StagedLead } from "../../domain/entities/StagedLead";
import { IngestionValidationError, StagedLeadNotFoundError } from "../../domain/errors/LeadCenterErrors";
import { validateNormalizedLead } from "../services/validateNormalizedLead";
import type { ClassifyDuplicatesPort } from "../ports/ClassifyDuplicatesPort";
import type { ExistingLeadLookupPort } from "../ports/ExistingLeadLookupPort";
import { BULK_MAX } from "../../constants";

export interface BulkStagedLeadsCommand {
  organizationId: string;
  stagedLeadIds: string[];
  actor: LeadCenterAuditActor;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
}

function assertBulkSize(ids: string[]) {
  if (ids.length === 0) throw new IngestionValidationError("Select at least one staged lead.");
  if (ids.length > BULK_MAX) {
    throw new IngestionValidationError(`Select at most ${BULK_MAX} staged leads per action.`);
  }
}

function isSharedIntake(lead: StagedLead): boolean {
  return lead.ownerManagerId == null && lead.ownerTeamLeadId == null;
}

function isWithinOwnershipScope(
  lead: StagedLead,
  ownerManagerId?: string | null,
  ownerTeamLeadId?: string | null,
): boolean {
  if (isSharedIntake(lead)) return true;
  if (ownerManagerId && lead.ownerManagerId !== ownerManagerId) return false;
  if (ownerTeamLeadId && lead.ownerTeamLeadId !== ownerTeamLeadId) return false;
  return true;
}

async function loadOwned(
  repository: LeadCenterRepository,
  command: BulkStagedLeadsCommand,
): Promise<StagedLead[]> {
  assertBulkSize(command.stagedLeadIds);
  const leads = await repository.findStagedLeadsByIds(
    command.organizationId,
    command.stagedLeadIds,
  );
  if (leads.length !== command.stagedLeadIds.length) {
    throw new StagedLeadNotFoundError("one or more selected ids");
  }
  return leads.filter((lead) => {
    if (lead.status === "DELETED") return false;
    return isWithinOwnershipScope(lead, command.ownerManagerId, command.ownerTeamLeadId);
  });
}

export function makeBulkAssignTags(repository: LeadCenterRepository) {
  return async function bulkAssignTags(
    command: BulkStagedLeadsCommand & { tags: string[]; mode?: "replace" | "append" },
  ) {
    const leads = await loadOwned(repository, command);
    const tags = command.tags.map((t) => t.trim()).filter(Boolean).slice(0, 20);
    const mode = command.mode ?? "append";
    let updated = 0;
    for (const lead of leads) {
      const next =
        mode === "replace" ? tags : [...new Set([...lead.tags, ...tags])].slice(0, 20);
      updated += await repository.updateStagedLeads(command.organizationId, [lead.id], {
        tags: next,
      });
    }
    await repository.appendAudit({
      organizationId: command.organizationId,
      actor: command.actor,
      action: "staged_lead.bulk_tags",
      targetType: "StagedLead",
      targetId: leads[0]?.id ?? command.organizationId,
      afterState: { count: updated, tags, mode },
    });
    return { updated };
  };
}

export function makeBulkAssignBranch(repository: LeadCenterRepository) {
  return async function bulkAssignBranch(
    command: BulkStagedLeadsCommand & { branchId: string | null },
  ) {
    const leads = await loadOwned(repository, command);
    const ids = leads.map((l) => l.id);
    const updated = await repository.updateStagedLeads(command.organizationId, ids, {
      branchId: command.branchId,
    });
    await repository.appendAudit({
      organizationId: command.organizationId,
      actor: command.actor,
      action: "staged_lead.bulk_branch",
      targetType: "StagedLead",
      targetId: ids[0] ?? command.organizationId,
      afterState: { count: updated, branchId: command.branchId },
    });
    return { updated };
  };
}

export function makeBulkAssignManager(repository: LeadCenterRepository) {
  return async function bulkAssignManager(
    command: BulkStagedLeadsCommand & { assignedManagerUserId: string | null },
  ) {
    const leads = await loadOwned(repository, command);
    const ids = leads.map((l) => l.id);
    const updated = await repository.updateStagedLeads(command.organizationId, ids, {
      assignedManagerUserId: command.assignedManagerUserId,
      ownerManagerId: command.assignedManagerUserId ?? command.ownerManagerId ?? null,
    });
    await repository.appendAudit({
      organizationId: command.organizationId,
      actor: command.actor,
      action: "staged_lead.bulk_manager",
      targetType: "StagedLead",
      targetId: ids[0] ?? command.organizationId,
      afterState: { count: updated, assignedManagerUserId: command.assignedManagerUserId },
    });
    return { updated };
  };
}

export function makeBulkArchiveStagedLeads(repository: LeadCenterRepository) {
  return async function bulkArchiveStagedLeads(command: BulkStagedLeadsCommand) {
    const leads = await loadOwned(repository, command);
    const ids = leads.filter((l) => l.importStatus !== "IMPORTED").map((l) => l.id);
    const updated = await repository.updateStagedLeads(command.organizationId, ids, {
      status: "ARCHIVED",
      archivedAt: new Date(),
    });
    await repository.appendAudit({
      organizationId: command.organizationId,
      actor: command.actor,
      action: "staged_lead.bulk_archive",
      targetType: "StagedLead",
      targetId: ids[0] ?? command.organizationId,
      afterState: { count: updated },
    });
    return { updated };
  };
}

export function makeBulkDeleteStagedLeads(repository: LeadCenterRepository) {
  return async function bulkDeleteStagedLeads(command: BulkStagedLeadsCommand) {
    const leads = await loadOwned(repository, command);
    const ids = leads.filter((l) => l.importStatus !== "IMPORTED").map((l) => l.id);
    const updated = await repository.updateStagedLeads(command.organizationId, ids, {
      status: "DELETED",
    });
    await repository.appendAudit({
      organizationId: command.organizationId,
      actor: command.actor,
      action: "staged_lead.bulk_delete",
      targetType: "StagedLead",
      targetId: ids[0] ?? command.organizationId,
      afterState: { count: updated },
    });
    return { updated };
  };
}

export function makeBulkValidateStagedLeads(repository: LeadCenterRepository) {
  return async function bulkValidateStagedLeads(command: BulkStagedLeadsCommand) {
    const leads = await loadOwned(repository, command);
    let valid = 0;
    let invalid = 0;
    for (const lead of leads) {
      if (lead.importStatus === "IMPORTED") continue;
      const result = validateNormalizedLead({
        rowNumber: 1,
        fullName: lead.fullName,
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        campaignNameHint: lead.campaignNameHint,
        tags: lead.tags,
        rawPayload: lead.rawPayload,
        normalizedPayload: lead.normalizedPayload ?? {},
      });
      await repository.updateStagedLeads(command.organizationId, [lead.id], {
        validationStatus: result.validationStatus,
        validationErrors: result.validationErrors.length > 0 ? result.validationErrors : null,
        status: result.validationStatus === "VALID" ? "MANAGER_REVIEW" : "VALIDATION",
      });
      if (result.validationStatus === "VALID") valid += 1;
      else invalid += 1;
    }
    return { valid, invalid, updated: valid + invalid };
  };
}

export function makeBulkRerunDuplicateCheck(
  repository: LeadCenterRepository,
  existingLeadLookup: ExistingLeadLookupPort,
  classifyDuplicates: ClassifyDuplicatesPort,
) {
  return async function bulkRerunDuplicateCheck(command: BulkStagedLeadsCommand) {
    const leads = await loadOwned(repository, command);
    const importable = leads.filter((l) => l.importStatus !== "IMPORTED");
    const existing = await existingLeadLookup.listForDuplicateScan(command.organizationId, {
      ownerManagerId: command.ownerManagerId ?? undefined,
      ownerTeamLeadId: command.ownerTeamLeadId ?? undefined,
    });
    const summary = classifyDuplicates.classify({
      rows: importable.map((lead, index) => ({
        rowNumber: index + 1,
        name: lead.fullName,
        phone: lead.phone ?? "",
        email: lead.email ?? "",
      })),
      existingLeads: existing,
      matchMode: "phone_or_email",
    });
    const byRow = new Map(
      [...summary.newLeads, ...summary.possibleDuplicates, ...summary.exactDuplicates].map(
        (row) => [row.rowNumber, row],
      ),
    );
    let updated = 0;
    for (let i = 0; i < importable.length; i++) {
      const lead = importable[i]!;
      const classification = byRow.get(i + 1);
      const duplicateStatus =
        classification?.category === "exact"
          ? "EXACT"
          : classification?.category === "possible"
            ? "POSSIBLE"
            : "NONE";
      updated += await repository.updateStagedLeads(command.organizationId, [lead.id], {
        duplicateStatus,
        matchReason: classification?.matchReason ?? null,
        matchedLeadId: classification?.existingLeadId ?? null,
        matchedCustomerId: classification?.existingCustomerId ?? null,
        status: duplicateStatus === "NONE" ? "PENDING_REVIEW" : "DUPLICATE_CHECK",
      });
    }
    return {
      updated,
      duplicateCount: summary.exactDuplicates.length + summary.possibleDuplicates.length,
    };
  };
}

export function makeExportStagedLeadsCsv(repository: LeadCenterRepository) {
  return async function exportStagedLeadsCsv(command: BulkStagedLeadsCommand) {
    const leads = await loadOwned(repository, command);
    const columns = [
      "id",
      "fullName",
      "phone",
      "email",
      "sourceCode",
      "campaignNameHint",
      "status",
      "duplicateStatus",
      "validationStatus",
      "importStatus",
      "tags",
      "createdAt",
    ];
    const rows = leads.map((lead) => ({
      id: lead.id,
      fullName: lead.fullName,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      sourceCode: lead.sourceCode,
      campaignNameHint: lead.campaignNameHint ?? "",
      status: lead.status,
      duplicateStatus: lead.duplicateStatus,
      validationStatus: lead.validationStatus,
      importStatus: lead.importStatus,
      tags: lead.tags.join("|"),
      createdAt: lead.createdAt.toISOString(),
    }));
    return renderCsv(columns, rows);
  };
}

export function makeBulkMergeDuplicateStagedLeads(repository: LeadCenterRepository) {
  return async function bulkMergeDuplicateStagedLeads(command: BulkStagedLeadsCommand) {
    const leads = await loadOwned(repository, command);
    const importable = leads.filter((l) => l.importStatus !== "IMPORTED" && l.status !== "DELETED");
    const byKey = new Map<string, StagedLead[]>();
    for (const lead of importable) {
      const phone = (lead.phone ?? "").replace(/\D+/g, "").slice(-10);
      const email = (lead.email ?? "").trim().toLowerCase();
      const key = phone || email;
      if (!key) continue;
      const list = byKey.get(key) ?? [];
      list.push(lead);
      byKey.set(key, list);
    }

    let kept = 0;
    let mergedAway = 0;
    for (const group of byKey.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const primary = group[0]!;
      const extras = group.slice(1);
      const mergedTags = [...new Set(group.flatMap((lead) => lead.tags))].slice(0, 20);
      await repository.updateStagedLeads(command.organizationId, [primary.id], {
        tags: mergedTags,
        status: "MANAGER_REVIEW",
        duplicateStatus: "NONE",
      });
      kept += 1;
      const extraIds = extras.map((lead) => lead.id);
      mergedAway += await repository.updateStagedLeads(command.organizationId, extraIds, {
        status: "DELETED",
        tags: [...(extras[0]?.tags ?? []), `merged_into:${primary.id}`],
      });
    }

    await repository.appendAudit({
      organizationId: command.organizationId,
      actor: command.actor,
      action: "staged_lead.bulk_merge_duplicates",
      targetType: "StagedLead",
      targetId: importable[0]?.id ?? command.organizationId,
      afterState: { kept, mergedAway },
    });
    return { kept, mergedAway };
  };
}

export { BULK_MAX } from "../../constants";

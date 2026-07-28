// ============================================================================
// src/modules/lead-center/application/use-cases/importStagedLeadsToCampaign.ts
//
// Promote reviewed staged leads into Campaign Leads via existing public APIs:
// resolve/create Customer → createLead → optional assignCampaignLeads.
// ============================================================================

import type { LeadCenterRepository } from "../../domain/repositories/LeadCenterRepository";
import type { LeadCenterAuditActor } from "../../domain/entities/LeadCenterAuditRecord";
import type { StagedLead } from "../../domain/entities/StagedLead";
import {
  IngestionValidationError,
  StagedLeadNotFoundError,
} from "../../domain/errors/LeadCenterErrors";
import type {
  CampaignLookupPort,
  CreateCampaignLeadPort,
  LeadSourceResolvePort,
  ResolveCustomerPort,
} from "../ports/CampaignImportPorts";
import {
  sourceCodesForImportScope,
  type LeadCenterImportScope,
} from "../../catalog";
import { BULK_MAX } from "../../constants";

export type CampaignImportAllocation = "EQUAL" | "ROUND_ROBIN" | "RANDOM" | "MANUAL" | "NONE";

export interface ImportStagedLeadsToCampaignCommand {
  organizationId: string;
  /** Explicit ids (optional when `sourceScope` is set). */
  stagedLeadIds?: string[];
  /**
   * Which integration sources to import: Facebook, Google, WhatsApp, or all three.
   * When set without ids, loads eligible staged leads for those sources.
   */
  sourceScope?: LeadCenterImportScope;
  actor: LeadCenterAuditActor;
  /** Existing campaign id XOR newCampaign. */
  campaignId?: string | null;
  newCampaign?: {
    name: string;
    description?: string;
    memberUserIds?: string[];
  } | null;
  ownerManagerId: string;
  ownerTeamLeadId?: string | null;
  /**
   * Hierarchy book scope for listing staged leads (Manager/Team Lead).
   * Distinct from `ownerManagerId` used as campaign owner.
   */
  scopeOwnerManagerId?: string | null;
  scopeOwnerTeamLeadId?: string | null;
  /** When set, Team Lead may only import into campaigns they own/manage. */
  allowedCampaignOwnerManagerId?: string | null;
  allocationMethod?: CampaignImportAllocation;
  manualAssigneeUserId?: string | null;
  /** Skip exact duplicates unless true. */
  includeExactDuplicates?: boolean;
  /** Skip invalid validation unless true. */
  includeInvalid?: boolean;
  correlationId?: string | null;
}

export interface ImportStagedLeadsToCampaignResult {
  campaignId: string;
  campaignName: string;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  createdLeadIds: string[];
  errors: Array<{ stagedLeadId: string; message: string }>;
  preview: Array<{
    stagedLeadId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    duplicateStatus: string;
    validationStatus: string;
    action: "import" | "skip";
    reason?: string;
  }>;
}

function eligibleForImport(
  lead: StagedLead,
  options: { includeExactDuplicates: boolean; includeInvalid: boolean },
): { ok: true } | { ok: false; reason: string } {
  if (lead.importStatus === "IMPORTED") return { ok: false, reason: "Already imported" };
  if (lead.status === "DELETED" || lead.status === "ARCHIVED") {
    return { ok: false, reason: `Status is ${lead.status}` };
  }
  if (!options.includeInvalid && lead.validationStatus === "INVALID") {
    return { ok: false, reason: "Failed validation" };
  }
  if (!options.includeExactDuplicates && lead.duplicateStatus === "EXACT") {
    return { ok: false, reason: "Exact duplicate" };
  }
  if (!lead.fullName || lead.fullName.length < 2) {
    return { ok: false, reason: "Missing name" };
  }
  if (!lead.phone && !lead.email) {
    return { ok: false, reason: "Missing phone and email" };
  }
  return { ok: true };
}

async function resolveStagedLeadIds(
  repository: LeadCenterRepository,
  command: Pick<
    ImportStagedLeadsToCampaignCommand,
    | "organizationId"
    | "stagedLeadIds"
    | "sourceScope"
    | "scopeOwnerManagerId"
    | "scopeOwnerTeamLeadId"
  >,
): Promise<string[]> {
  const allowedCodes = command.sourceScope
    ? new Set(sourceCodesForImportScope(command.sourceScope))
    : null;

  if (command.stagedLeadIds && command.stagedLeadIds.length > 0) {
    if (command.stagedLeadIds.length > BULK_MAX) {
      throw new IngestionValidationError(`Select at most ${BULK_MAX} staged leads per import.`);
    }
    const leads = await repository.findStagedLeadsByIds(
      command.organizationId,
      command.stagedLeadIds,
    );
    if (leads.length !== command.stagedLeadIds.length) {
      throw new StagedLeadNotFoundError("one or more selected ids");
    }
    return leads
      .filter((lead) => {
        if (allowedCodes && !allowedCodes.has(lead.sourceCode as never)) return false;
        // Shared intake (null/null) is visible to Manager/TL books; otherwise enforce scope.
        const unowned = lead.ownerManagerId == null && lead.ownerTeamLeadId == null;
        if (unowned) return true;
        if (
          command.scopeOwnerManagerId &&
          lead.ownerManagerId !== command.scopeOwnerManagerId
        ) {
          return false;
        }
        if (
          command.scopeOwnerTeamLeadId &&
          lead.ownerTeamLeadId !== command.scopeOwnerTeamLeadId
        ) {
          return false;
        }
        return true;
      })
      .map((lead) => lead.id);
  }

  if (!command.sourceScope) {
    throw new IngestionValidationError(
      "Choose a lead source (Facebook, Google, WhatsApp, or all three).",
    );
  }

  const listed = await repository.listStagedLeads(command.organizationId, {
    sourceCodes: [...allowedCodes!],
    ownerManagerId: command.scopeOwnerManagerId || undefined,
    ownerTeamLeadId: command.scopeOwnerTeamLeadId || undefined,
    limit: BULK_MAX * 2,
    offset: 0,
  });

  const ids = listed
    .filter(
      (lead) =>
        lead.importStatus !== "IMPORTED" &&
        lead.status !== "DELETED" &&
        lead.status !== "ARCHIVED",
    )
    .slice(0, BULK_MAX)
    .map((lead) => lead.id);

  if (ids.length === 0) {
    throw new IngestionValidationError("No staged leads found for the selected source(s).");
  }
  return ids;
}

export function makePreviewCampaignImport(repository: LeadCenterRepository) {
  return async function previewCampaignImport(
    command: Pick<
      ImportStagedLeadsToCampaignCommand,
      | "organizationId"
      | "stagedLeadIds"
      | "sourceScope"
      | "includeExactDuplicates"
      | "includeInvalid"
      | "scopeOwnerManagerId"
      | "scopeOwnerTeamLeadId"
    >,
  ): Promise<ImportStagedLeadsToCampaignResult["preview"]> {
    const stagedLeadIds = await resolveStagedLeadIds(repository, command);
    const leads = await repository.findStagedLeadsByIds(command.organizationId, stagedLeadIds);
    const options = {
      includeExactDuplicates: command.includeExactDuplicates ?? false,
      includeInvalid: command.includeInvalid ?? false,
    };
    return leads.map((lead) => {
      const check = eligibleForImport(lead, options);
      return {
        stagedLeadId: lead.id,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        duplicateStatus: lead.duplicateStatus,
        validationStatus: lead.validationStatus,
        action: check.ok ? ("import" as const) : ("skip" as const),
        reason: check.ok ? undefined : check.reason,
      };
    });
  };
}

export function makeImportStagedLeadsToCampaign(
  repository: LeadCenterRepository,
  customers: ResolveCustomerPort,
  createLead: CreateCampaignLeadPort,
  leadSources: LeadSourceResolvePort,
  campaigns: CampaignLookupPort,
) {
  const preview = makePreviewCampaignImport(repository);

  return async function importStagedLeadsToCampaign(
    command: ImportStagedLeadsToCampaignCommand,
  ): Promise<ImportStagedLeadsToCampaignResult> {
    if (!command.campaignId && !command.newCampaign?.name) {
      throw new IngestionValidationError("Choose an existing campaign or create a new one.");
    }

    const stagedLeadIds = await resolveStagedLeadIds(repository, command);

    let campaignId = command.campaignId ?? null;
    let campaignName = "";

    if (command.newCampaign?.name) {
      const created = await campaigns.createCampaign({
        organizationId: command.organizationId,
        name: command.newCampaign.name,
        description: command.newCampaign.description,
        ownerManagerId: command.ownerManagerId,
        actorUserId: command.actor.id ?? command.ownerManagerId,
        memberUserIds: command.newCampaign.memberUserIds,
      });
      campaignId = created.id;
      campaignName = created.name;
    } else if (campaignId) {
      const existing = await campaigns.getCampaign(campaignId);
      if (!existing || existing.organizationId !== command.organizationId) {
        throw new IngestionValidationError("Campaign not found.");
      }
      if (
        command.allowedCampaignOwnerManagerId &&
        existing.ownerManagerId !== command.allowedCampaignOwnerManagerId
      ) {
        throw new IngestionValidationError(
          "You can only import into campaigns you own or manage.",
        );
      }
      campaignName = existing.name;
    }

    if (!campaignId) {
      throw new IngestionValidationError("Campaign could not be resolved.");
    }

    const previewRows = await preview({
      organizationId: command.organizationId,
      stagedLeadIds,
      includeExactDuplicates: command.includeExactDuplicates,
      includeInvalid: command.includeInvalid,
      scopeOwnerManagerId: command.scopeOwnerManagerId,
      scopeOwnerTeamLeadId: command.scopeOwnerTeamLeadId,
    });

    const leads = await repository.findStagedLeadsByIds(command.organizationId, stagedLeadIds);
    if (leads.length !== stagedLeadIds.length) {
      throw new StagedLeadNotFoundError("one or more selected ids");
    }
    const byId = new Map(leads.map((lead) => [lead.id, lead]));

    const createdLeadIds: string[] = [];
    const errors: Array<{ stagedLeadId: string; message: string }> = [];
    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const row of previewRows) {
      if (row.action === "skip") {
        skippedCount += 1;
        continue;
      }
      const staged = byId.get(row.stagedLeadId);
      if (!staged) {
        failedCount += 1;
        errors.push({ stagedLeadId: row.stagedLeadId, message: "Staged lead missing" });
        continue;
      }

      try {
        await repository.updateStagedLeads(command.organizationId, [staged.id], {
          importStatus: "QUEUED",
        });

        const customer = await customers.resolveOrCreate({
          organizationId: command.organizationId,
          fullName: staged.fullName,
          phone: staged.phone,
          email: staged.email,
          actorUserId: command.actor.id ?? command.ownerManagerId,
          ownerManagerId: staged.ownerManagerId ?? command.ownerManagerId,
        });

        const leadSourceId = await leadSources.resolveSourceId(
          command.organizationId,
          staged.sourceCode,
        );

        const created = await createLead.create({
          organizationId: command.organizationId,
          customerId: customer.id,
          leadSourceId,
          fullNameSnapshot: staged.fullName,
          phoneSnapshot: staged.phone,
          emailSnapshot: staged.email,
          campaignId,
          ownerManagerId: staged.ownerManagerId ?? command.ownerManagerId,
          ownerTeamLeadId: staged.ownerTeamLeadId ?? command.ownerTeamLeadId ?? null,
          actorUserId: command.actor.id ?? command.ownerManagerId,
        });

        createdLeadIds.push(created.id);
        importedCount += 1;

        await repository.updateStagedLeads(command.organizationId, [staged.id], {
          status: "IMPORTED",
          importStatus: "IMPORTED",
          importedLeadId: created.id,
          importedCampaignId: campaignId,
          importedAt: new Date(),
        });
      } catch (error) {
        failedCount += 1;
        const message = error instanceof Error ? error.message : "Import failed";
        errors.push({ stagedLeadId: staged.id, message });
        await repository.updateStagedLeads(command.organizationId, [staged.id], {
          importStatus: "FAILED",
        });
      }
    }

    const allocation = command.allocationMethod ?? "NONE";
    if (allocation !== "NONE" && createdLeadIds.length > 0) {
      await campaigns.assignLeads({
        campaignId,
        leadIds: createdLeadIds,
        allocationMethod: allocation,
        manualAssigneeUserId: command.manualAssigneeUserId ?? undefined,
        actorUserId: command.actor.id ?? command.ownerManagerId,
      });
    }

    await repository.appendAudit({
      organizationId: command.organizationId,
      actor: command.actor,
      action: "staged_lead.campaign_import",
      targetType: "Campaign",
      targetId: campaignId,
      afterState: {
        importedCount,
        skippedCount,
        failedCount,
        createdLeadIds,
        allocation,
        sourceScope: command.sourceScope ?? null,
      },
      correlationId: command.correlationId,
    });

    return {
      campaignId,
      campaignName,
      importedCount,
      skippedCount,
      failedCount,
      createdLeadIds,
      errors,
      preview: previewRows,
    };
  };
}

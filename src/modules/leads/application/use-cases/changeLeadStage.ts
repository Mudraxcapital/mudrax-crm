// ============================================================================
// src/modules/leads/application/use-cases/changeLeadStage.ts
//
// Moves a Lead to a different pipeline Stage (leads.md). A Lost Reason and a
// compulsory note are required whenever the target Stage is Closed-Lost;
// Do Not Disturb requires a compulsory note and moves the lead into the
// Do Not Disturb campaign. Reopening an already-Closed Lead is not supported.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadNoteRepository } from "../../domain/repositories/LeadNoteRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import {
  DndNoteRequiredError,
  InvalidLeadStageReferenceError,
  InvalidLostReasonReferenceError,
  LeadAlreadyClosedError,
  LeadNotFoundError,
  LostNoteRequiredError,
  LostReasonRequiredError,
} from "../../domain/errors/LeadErrors";
import type { ChangeLeadStageInput } from "../validators/leadSchemas";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";
import { isDoNotDisturbStageName } from "../lib/doNotDisturbPolicy";

export interface ChangeLeadStageCommand {
  id: string;
  input: ChangeLeadStageInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

export type ResolveDndCampaignId = (args: {
  organizationId: string;
  preferredOwnerManagerId: string | null;
  actor: LeadAuditActor;
  correlationId?: string | null;
}) => Promise<string | null>;

async function defaultResolveDndCampaignId(args: {
  organizationId: string;
  preferredOwnerManagerId: string | null;
  actor: LeadAuditActor;
  correlationId?: string | null;
}): Promise<string | null> {
  const { ensureDndCampaign } = await import("@/modules/campaigns");
  const { listUsersByRole } = await import("@/modules/users");

  let ownerManagerId = args.preferredOwnerManagerId;
  if (!ownerManagerId) {
    const managers = await listUsersByRole("Manager");
    ownerManagerId =
      managers.find((manager) => manager.organizationId === args.organizationId)?.id ??
      managers[0]?.id ??
      null;
  }
  if (!ownerManagerId) return null;

  const campaign = await ensureDndCampaign({
    organizationId: args.organizationId,
    ownerManagerId,
    actor: {
      actorType: args.actor.actorType,
      actorId: args.actor.actorId || ownerManagerId,
    },
    correlationId: args.correlationId,
  });
  return campaign.id;
}

export function makeChangeLeadStage(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  noteRepository: LeadNoteRepository,
  resolveDndCampaignId: ResolveDndCampaignId = defaultResolveDndCampaignId,
) {
  return async function changeLeadStage(command: ChangeLeadStageCommand): Promise<LeadDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new LeadNotFoundError(id);
    }

    const currentStage = await catalogRepository.findStageById(existing.currentStageId);
    if (currentStage?.bucket === "CLOSED") {
      throw new LeadAlreadyClosedError(id);
    }

    const targetStage = await catalogRepository.findStageById(input.stageId);
    if (!targetStage || targetStage.organizationId !== existing.organizationId) {
      throw new InvalidLeadStageReferenceError(input.stageId);
    }

    const isDnd = isDoNotDisturbStageName(targetStage.name);
    let lostReasonId: string | null = null;
    let noteBody: string | null = null;

    if (targetStage.bucket === "CLOSED" && targetStage.closeOutcome === "LOST") {
      if (!input.lostReasonId) {
        throw new LostReasonRequiredError();
      }
      const lostReason = await catalogRepository.findLostReasonById(input.lostReasonId);
      if (!lostReason || lostReason.organizationId !== existing.organizationId) {
        throw new InvalidLostReasonReferenceError(input.lostReasonId);
      }
      lostReasonId = lostReason.id;

      const body = input.note?.trim() ?? "";
      if (!body) {
        throw new LostNoteRequiredError();
      }
      if (!actor.actorId) {
        throw new LostNoteRequiredError();
      }
      noteBody = body;
    } else if (isDnd) {
      const body = input.note?.trim() ?? "";
      if (!body) {
        throw new DndNoteRequiredError();
      }
      if (!actor.actorId) {
        throw new DndNoteRequiredError();
      }
      noteBody = body;
    }

    let dndCampaignId: string | undefined;
    if (isDnd) {
      const resolved = await resolveDndCampaignId({
        organizationId: existing.organizationId,
        preferredOwnerManagerId: existing.ownerManagerId,
        actor,
        correlationId,
      });
      if (!resolved) {
        throw new Error(
          "Could not create or find the Do Not Disturb campaign. Ensure a Manager exists in the organization.",
        );
      }
      dndCampaignId = resolved;
    }

    const now = new Date();
    const updated = await repository.changeStageWithAudit(
      id,
      {
        currentStageId: targetStage.id,
        lostReasonId,
        wonAt: targetStage.bucket === "CLOSED" && targetStage.closeOutcome === "WON" ? now : null,
        lostAt: targetStage.bucket === "CLOSED" && targetStage.closeOutcome === "LOST" ? now : null,
        ...(dndCampaignId !== undefined ? { campaignId: dndCampaignId } : {}),
      },
      actor,
      correlationId,
    );

    if (noteBody && actor.actorId) {
      await noteRepository.createWithAudit(
        {
          leadId: id,
          authorUserId: actor.actorId,
          body: noteBody,
        },
        actor,
        correlationId,
      );
    }

    const catalogs = await loadCatalogLookups(catalogRepository, updated.organizationId);
    return toLeadDto(updated, catalogs);
  };
}

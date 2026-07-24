// ============================================================================
// src/modules/leads/application/use-cases/changeLeadStage.ts
//
// Moves a Lead to a different pipeline Stage (leads.md). A Lost Reason is
// required whenever the target Stage is Closed-Lost; reopening an
// already-Closed Lead is not supported.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import {
  InvalidLeadStageReferenceError,
  InvalidLostReasonReferenceError,
  LeadAlreadyClosedError,
  LeadNotFoundError,
  LostReasonRequiredError,
} from "../../domain/errors/LeadErrors";
import type { ChangeLeadStageInput } from "../validators/leadSchemas";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";

export interface ChangeLeadStageCommand {
  id: string;
  input: ChangeLeadStageInput;
  actor: LeadAuditActor;
  correlationId?: string | null;
}

export function makeChangeLeadStage(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
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

    let lostReasonId: string | null = null;
    if (targetStage.bucket === "CLOSED" && targetStage.closeOutcome === "LOST") {
      if (!input.lostReasonId) {
        throw new LostReasonRequiredError();
      }
      const lostReason = await catalogRepository.findLostReasonById(input.lostReasonId);
      if (!lostReason || lostReason.organizationId !== existing.organizationId) {
        throw new InvalidLostReasonReferenceError(input.lostReasonId);
      }
      lostReasonId = lostReason.id;
    }

    const now = new Date();
    const updated = await repository.changeStageWithAudit(
      id,
      {
        currentStageId: targetStage.id,
        lostReasonId,
        wonAt: targetStage.bucket === "CLOSED" && targetStage.closeOutcome === "WON" ? now : null,
        lostAt: targetStage.bucket === "CLOSED" && targetStage.closeOutcome === "LOST" ? now : null,
      },
      actor,
      correlationId,
    );

    const catalogs = await loadCatalogLookups(catalogRepository, updated.organizationId);
    return toLeadDto(updated, catalogs);
  };
}

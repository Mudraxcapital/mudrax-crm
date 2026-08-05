// ============================================================================
// src/modules/leads/application/use-cases/mergeLeads.ts
//
// Lead Merge: close the discarded Lead as Lost ("Duplicate Lead") while the
// surviving Lead remains active. Customer identity merge is owned by
// `customers` (customers.md); this use-case only consolidates Lead pipeline
// duplicates under the same Customer.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadNoteRepository } from "../../domain/repositories/LeadNoteRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import {
  LeadAlreadyClosedError,
  LeadMergeError,
  LeadNotFoundError,
  LostReasonRequiredError,
} from "../../domain/errors/LeadErrors";
import type { MergeLeadsInput } from "../validators/productivitySchemas";
import { toLeadDto, type LeadDto } from "../dto/LeadDto";
import { loadCatalogLookups } from "./catalogLookups";
import { makeChangeLeadStage } from "./changeLeadStage";

export function makeMergeLeads(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  noteRepository: LeadNoteRepository,
) {
  const changeLeadStage = makeChangeLeadStage(repository, catalogRepository, noteRepository);

  return async function mergeLeads(command: {
    organizationId: string;
    input: MergeLeadsInput;
    actor: LeadAuditActor;
  }): Promise<{ surviving: LeadDto; mergedAway: LeadDto }> {
    const { organizationId, input, actor } = command;

    if (input.survivingLeadId === input.mergedAwayLeadId) {
      throw new LeadMergeError("Surviving and merged-away Leads must be different.");
    }

    const surviving = await repository.findById(input.survivingLeadId);
    const mergedAway = await repository.findById(input.mergedAwayLeadId);
    if (!surviving || surviving.organizationId !== organizationId) {
      throw new LeadNotFoundError(input.survivingLeadId);
    }
    if (!mergedAway || mergedAway.organizationId !== organizationId) {
      throw new LeadNotFoundError(input.mergedAwayLeadId);
    }
    if (surviving.customerId !== mergedAway.customerId) {
      throw new LeadMergeError(
        "Lead Merge requires both Leads to belong to the same Customer. Merge the Customers first if they are duplicates.",
      );
    }

    const stages = await catalogRepository.listStages(organizationId);
    const lostStage = stages.find(
      (stage) => stage.bucket === "CLOSED" && stage.closeOutcome === "LOST" && stage.isActive,
    );
    if (!lostStage) {
      throw new LeadMergeError("No Closed-Lost Lead Stage is configured.");
    }

    const lostReasons = await catalogRepository.listLostReasons(organizationId);
    const duplicateReason =
      lostReasons.find((reason) => reason.name.toLowerCase().includes("duplicate")) ??
      lostReasons[0];
    const lostReasonId = input.lostReasonId ?? duplicateReason?.id;
    if (!lostReasonId) {
      throw new LostReasonRequiredError();
    }

    const survivingStage = stages.find((stage) => stage.id === surviving.currentStageId);
    if (survivingStage?.bucket === "CLOSED") {
      throw new LeadAlreadyClosedError(surviving.id);
    }

    // Stage-change audit on the merged-away Lead carries correlationId = survivor.
    await changeLeadStage({
      id: mergedAway.id,
      input: {
        stageId: lostStage.id,
        lostReasonId,
        note: `Merged into lead ${surviving.id} (duplicate close).`,
      },
      actor,
      correlationId: surviving.id,
    });

    const [afterSurvivor, afterMerged, catalogs] = await Promise.all([
      repository.findById(surviving.id),
      repository.findById(mergedAway.id),
      loadCatalogLookups(catalogRepository, organizationId),
    ]);

    if (!afterSurvivor || !afterMerged) {
      throw new LeadNotFoundError(surviving.id);
    }

    return {
      surviving: toLeadDto(afterSurvivor, catalogs),
      mergedAway: toLeadDto(afterMerged, catalogs),
    };
  };
}

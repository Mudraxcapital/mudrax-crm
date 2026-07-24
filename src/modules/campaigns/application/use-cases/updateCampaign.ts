// ============================================================================
// src/modules/campaigns/application/use-cases/updateCampaign.ts
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import { CampaignNotFoundError } from "../../domain/errors/CampaignErrors";
import type { UpdateCampaignInput } from "../validators/campaignSchemas";
import { toCampaignDto, type CampaignDto } from "../dto/CampaignDto";

export interface UpdateCampaignCommand {
  id: string;
  input: UpdateCampaignInput;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

export function makeUpdateCampaign(repository: CampaignRepository) {
  return async function updateCampaign(command: UpdateCampaignCommand): Promise<CampaignDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new CampaignNotFoundError(id);
    }

    const updated = await repository.updateWithAudit(id, input, actor, correlationId);
    return toCampaignDto(updated);
  };
}

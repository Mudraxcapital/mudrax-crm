// ============================================================================
// src/modules/campaigns/application/use-cases/createCampaign.ts
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import type { CreateCampaignInput } from "../validators/campaignSchemas";
import { toCampaignDto, type CampaignDto } from "../dto/CampaignDto";

export interface CreateCampaignCommand {
  organizationId: string;
  input: CreateCampaignInput;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

export function makeCreateCampaign(repository: CampaignRepository) {
  return async function createCampaign(command: CreateCampaignCommand): Promise<CampaignDto> {
    const { organizationId, input, actor, correlationId } = command;

    const created = await repository.createWithAudit(
      {
        organizationId,
        name: input.name,
        description: input.description ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        createdByUserId: actor.actorId ?? "",
      },
      actor,
      correlationId,
    );

    return toCampaignDto(created);
  };
}

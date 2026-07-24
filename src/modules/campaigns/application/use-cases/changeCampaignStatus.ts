// ============================================================================
// src/modules/campaigns/application/use-cases/changeCampaignStatus.ts
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import { CAMPAIGN_STATUS_TRANSITIONS } from "../../domain/entities/Campaign";
import {
  CampaignNotFoundError,
  InvalidCampaignStatusTransitionError,
} from "../../domain/errors/CampaignErrors";
import type { ChangeCampaignStatusInput } from "../validators/campaignSchemas";
import { toCampaignDto, type CampaignDto } from "../dto/CampaignDto";

export interface ChangeCampaignStatusCommand {
  id: string;
  input: ChangeCampaignStatusInput;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

export function makeChangeCampaignStatus(repository: CampaignRepository) {
  return async function changeCampaignStatus(
    command: ChangeCampaignStatusCommand,
  ): Promise<CampaignDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new CampaignNotFoundError(id);
    }

    if (existing.status !== input.status) {
      const allowed = CAMPAIGN_STATUS_TRANSITIONS[existing.status];
      if (!allowed.includes(input.status)) {
        throw new InvalidCampaignStatusTransitionError(existing.status, input.status);
      }
    }

    const updated = await repository.changeStatusWithAudit(id, input.status, actor, correlationId);
    return toCampaignDto(updated);
  };
}

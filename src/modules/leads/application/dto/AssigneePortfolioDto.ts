// ============================================================================
// src/modules/leads/application/dto/AssigneePortfolioDto.ts
// ============================================================================

import type { LeadDto } from "./LeadDto";

export interface AssigneePortfolioSummaryDto {
  assignedLeads: number;
  pending: number;
  completed: number;
  connected: number;
  followUps: number;
  won: number;
  lost: number;
}

export interface AssigneePortfolioDto {
  userId: string;
  summary: AssigneePortfolioSummaryDto;
  leads: LeadDto[];
  /** Dynamic stage breakdown from CRM Lead Stage catalog. */
  byStage: Array<{ stageId: string; stageName: string; count: number }>;
}

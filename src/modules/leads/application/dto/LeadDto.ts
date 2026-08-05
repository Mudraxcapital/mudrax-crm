// ============================================================================
// src/modules/leads/application/dto/LeadDto.ts
//
// What the Lead aggregate's use-cases return to the presentation layer — a
// plain, serializable shape (dates as ISO strings), enriched with the
// catalog display names the presentation layer needs (Stage/Source/Lost
// Reason names) so pages don't have to re-join catalogs themselves.
// ============================================================================

import type { Lead } from "../../domain/entities/Lead";
import type { LeadSource, LeadStage, LostReason } from "../../domain/entities/LeadCatalogs";
import type { LeadFieldValueDto } from "./LeadFieldDefinitionDto";

export interface LeadDto {
  id: string;
  organizationId: string;
  customerId: string;
  leadSourceId: string;
  leadSourceName: string;
  currentStageId: string;
  currentStageName: string;
  currentStageBucket: LeadStage["bucket"];
  lostReasonId: string | null;
  lostReasonName: string | null;
  campaignId: string | null;
  currentAssigneeUserId: string | null;
  permanentAssigneeUserId: string | null;
  temporaryAssigneeUntil: string | null;
  /** True when a temporary cover is active and not yet expired. */
  isTemporaryAssignee: boolean;
  ownerManagerId: string | null;
  ownerTeamLeadId: string | null;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  nextActionAt: string | null;
  nextActionType: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Dynamic custom (+ mirrored system) field values when loaded. */
  fieldValues?: LeadFieldValueDto[];
}

export interface LeadCatalogLookups {
  stagesById: Map<string, LeadStage>;
  sourcesById: Map<string, LeadSource>;
  lostReasonsById: Map<string, LostReason>;
}

export function toLeadDto(lead: Lead, catalogs: LeadCatalogLookups): LeadDto {
  const stage = catalogs.stagesById.get(lead.currentStageId);
  const source = catalogs.sourcesById.get(lead.leadSourceId);
  const lostReason = lead.lostReasonId
    ? catalogs.lostReasonsById.get(lead.lostReasonId)
    : undefined;

  return {
    id: lead.id,
    organizationId: lead.organizationId,
    customerId: lead.customerId,
    leadSourceId: lead.leadSourceId,
    leadSourceName: source?.name ?? "Unknown",
    currentStageId: lead.currentStageId,
    currentStageName: stage?.name ?? "Unknown",
    currentStageBucket: stage?.bucket ?? "INITIAL",
    lostReasonId: lead.lostReasonId,
    lostReasonName: lostReason?.name ?? null,
    campaignId: lead.campaignId,
    currentAssigneeUserId: lead.currentAssigneeUserId,
    permanentAssigneeUserId: lead.permanentAssigneeUserId,
    temporaryAssigneeUntil: lead.temporaryAssigneeUntil
      ? lead.temporaryAssigneeUntil.toISOString()
      : null,
    isTemporaryAssignee: Boolean(
      lead.temporaryAssigneeUntil && lead.temporaryAssigneeUntil.getTime() > Date.now(),
    ),
    ownerManagerId: lead.ownerManagerId,
    ownerTeamLeadId: lead.ownerTeamLeadId,
    fullNameSnapshot: lead.fullNameSnapshot,
    phoneSnapshot: lead.phoneSnapshot,
    emailSnapshot: lead.emailSnapshot,
    nextActionAt: lead.nextActionAt ? lead.nextActionAt.toISOString() : null,
    nextActionType: lead.nextActionType,
    wonAt: lead.wonAt ? lead.wonAt.toISOString() : null,
    lostAt: lead.lostAt ? lead.lostAt.toISOString() : null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

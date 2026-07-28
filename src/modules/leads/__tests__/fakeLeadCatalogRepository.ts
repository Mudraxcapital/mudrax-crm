// ============================================================================
// src/modules/leads/__tests__/fakeLeadCatalogRepository.ts
//
// In-memory LeadCatalogRepository double, pre-seeded with a minimal set of
// Stages/Sources/Lost Reasons for one Organization.
// ============================================================================

import type { LeadCatalogRepository } from "../domain/repositories/LeadCatalogRepository";
import type { LeadSource, LeadStage, LostReason } from "../domain/entities/LeadCatalogs";

export const ORG_ID = "org-1";

export const STAGE_NEW: LeadStage = {
  id: "stage-new",
  organizationId: ORG_ID,
  name: "New",
  bucket: "INITIAL",
  closeOutcome: null,
  sortOrder: 1,
  isActive: true,
};

export const STAGE_CONTACTED: LeadStage = {
  id: "stage-contacted",
  organizationId: ORG_ID,
  name: "Contacted",
  bucket: "ACTIVE",
  closeOutcome: null,
  sortOrder: 2,
  isActive: true,
};

export const STAGE_WON: LeadStage = {
  id: "stage-won",
  organizationId: ORG_ID,
  name: "Won",
  bucket: "CLOSED",
  closeOutcome: "WON",
  sortOrder: 3,
  isActive: true,
};

export const STAGE_LOST: LeadStage = {
  id: "stage-lost",
  organizationId: ORG_ID,
  name: "Lost",
  bucket: "CLOSED",
  closeOutcome: "LOST",
  sortOrder: 4,
  isActive: true,
};

export const SOURCE_WEBSITE: LeadSource = {
  id: "source-website",
  organizationId: ORG_ID,
  name: "Website",
  isActive: true,
};

export const LOST_REASON_PRICE: LostReason = {
  id: "lost-reason-price",
  organizationId: ORG_ID,
  name: "Price too high",
  isActive: true,
};

export class FakeLeadCatalogRepository implements LeadCatalogRepository {
  stages = [STAGE_NEW, STAGE_CONTACTED, STAGE_WON, STAGE_LOST];
  sources = [SOURCE_WEBSITE];
  lostReasons = [LOST_REASON_PRICE];

  async findStageById(id: string): Promise<LeadStage | null> {
    return this.stages.find((stage) => stage.id === id) ?? null;
  }

  async listStages(organizationId: string): Promise<LeadStage[]> {
    return this.stages.filter((stage) => stage.organizationId === organizationId);
  }

  async findDefaultStage(organizationId: string): Promise<LeadStage | null> {
    return (
      this.stages.find(
        (stage) => stage.organizationId === organizationId && stage.bucket === "INITIAL",
      ) ?? null
    );
  }

  async findSourceById(id: string): Promise<LeadSource | null> {
    return this.sources.find((source) => source.id === id) ?? null;
  }

  async listSources(organizationId: string): Promise<LeadSource[]> {
    return this.sources.filter((source) => source.organizationId === organizationId);
  }

  async findDefaultSource(organizationId: string): Promise<LeadSource | null> {
    const sources = await this.listSources(organizationId);
    return (
      sources.find(
        (source) => source.isActive && source.name.trim().toLowerCase() === "data",
      ) ??
      sources.find((source) => source.isActive) ??
      sources[0] ??
      null
    );
  }

  async findLostReasonById(id: string): Promise<LostReason | null> {
    return this.lostReasons.find((reason) => reason.id === id) ?? null;
  }

  async listLostReasons(organizationId: string): Promise<LostReason[]> {
    return this.lostReasons.filter((reason) => reason.organizationId === organizationId);
  }
}

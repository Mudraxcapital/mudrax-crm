// ============================================================================
// src/modules/leads/infrastructure/repositories/PrismaLeadCatalogRepository.ts
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadSource, LeadStage, LostReason } from "../../domain/entities/LeadCatalogs";
import { toLeadSource, toLeadStage, toLostReason } from "../mappers/leadMapper";

export class PrismaLeadCatalogRepository implements LeadCatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findStageById(id: string): Promise<LeadStage | null> {
    const row = await this.prisma.leadStage.findUnique({ where: { id } });
    return row ? toLeadStage(row) : null;
  }

  async listStages(organizationId: string): Promise<LeadStage[]> {
    const rows = await this.prisma.leadStage.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toLeadStage);
  }

  async findDefaultStage(organizationId: string): Promise<LeadStage | null> {
    // Prefer the real "Fresh" stage; never return leftover Integration Test catalog rows.
    const fresh = await this.prisma.leadStage.findFirst({
      where: {
        organizationId,
        bucket: "INITIAL",
        isActive: true,
        name: { equals: "Fresh", mode: "insensitive" },
      },
      orderBy: { sortOrder: "asc" },
    });
    if (fresh) return toLeadStage(fresh);

    const row = await this.prisma.leadStage.findFirst({
      where: {
        organizationId,
        bucket: "INITIAL",
        isActive: true,
        NOT: { name: { startsWith: "Integration Test", mode: "insensitive" } },
      },
      orderBy: { sortOrder: "asc" },
    });
    return row ? toLeadStage(row) : null;
  }

  async findSourceById(id: string): Promise<LeadSource | null> {
    const row = await this.prisma.leadSource.findUnique({ where: { id } });
    return row ? toLeadSource(row) : null;
  }

  async listSources(organizationId: string): Promise<LeadSource[]> {
    const rows = await this.prisma.leadSource.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    const sources = rows.map(toLeadSource);
    const dataIndex = sources.findIndex(
      (source) => source.name.trim().toLowerCase() === "data",
    );
    if (dataIndex <= 0) return sources;
    const [dataSource] = sources.splice(dataIndex, 1);
    return dataSource ? [dataSource, ...sources] : sources;
  }

  async findDefaultSource(organizationId: string): Promise<LeadSource | null> {
    const dataSource = await this.prisma.leadSource.findFirst({
      where: {
        organizationId,
        isActive: true,
        name: { equals: "Data", mode: "insensitive" },
      },
    });
    if (dataSource) return toLeadSource(dataSource);

    const fallback = await this.prisma.leadSource.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    });
    return fallback ? toLeadSource(fallback) : null;
  }

  async findLostReasonById(id: string): Promise<LostReason | null> {
    const row = await this.prisma.lostReason.findUnique({ where: { id } });
    return row ? toLostReason(row) : null;
  }

  async listLostReasons(organizationId: string): Promise<LostReason[]> {
    const rows = await this.prisma.lostReason.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return rows.map(toLostReason);
  }
}

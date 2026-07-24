// ============================================================================
// src/modules/leads/infrastructure/repositories/PrismaSavedViewRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateSavedViewData,
  SavedViewRepository,
  UpdateSavedViewData,
} from "../../domain/repositories/SavedViewRepository";
import type { SavedView } from "../../domain/entities/SavedView";
import { toSavedView } from "../mappers/savedViewMapper";

export class PrismaSavedViewRepository implements SavedViewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<SavedView | null> {
    const row = await this.prisma.savedView.findUnique({ where: { id } });
    return row ? toSavedView(row) : null;
  }

  async listForUser(ownerUserId: string): Promise<SavedView[]> {
    const rows = await this.prisma.savedView.findMany({
      where: {
        OR: [{ ownerUserId }, { isShared: true }],
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toSavedView);
  }

  async create(data: CreateSavedViewData): Promise<SavedView> {
    const row = await this.prisma.savedView.create({
      data: {
        ownerUserId: data.ownerUserId,
        name: data.name,
        filterConfig: data.filterConfig as Prisma.InputJsonValue,
        isShared: data.isShared,
      },
    });
    return toSavedView(row);
  }

  async update(id: string, data: UpdateSavedViewData): Promise<SavedView> {
    const row = await this.prisma.savedView.update({
      where: { id },
      data: {
        name: data.name,
        filterConfig: data.filterConfig as Prisma.InputJsonValue | undefined,
        isShared: data.isShared,
      },
    });
    return toSavedView(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.savedView.delete({ where: { id } });
  }
}

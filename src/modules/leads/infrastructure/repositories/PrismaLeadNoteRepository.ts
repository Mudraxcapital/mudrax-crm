// ============================================================================
// src/modules/leads/infrastructure/repositories/PrismaLeadNoteRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateLeadNoteData,
  LeadNoteRepository,
} from "../../domain/repositories/LeadNoteRepository";
import type { LeadNote } from "../../domain/entities/LeadNote";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import { toLeadNote } from "../mappers/leadMapper";

const TARGET_TYPE_LEAD_NOTE = "LeadNote";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(note: LeadNote): Prisma.InputJsonValue {
  return { id: note.id, leadId: note.leadId, authorUserId: note.authorUserId, body: note.body };
}

export class PrismaLeadNoteRepository implements LeadNoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<LeadNote | null> {
    const row = await this.prisma.leadNote.findUnique({ where: { id } });
    return row ? toLeadNote(row) : null;
  }

  async listByLead(leadId: string): Promise<LeadNote[]> {
    const rows = await this.prisma.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toLeadNote);
  }

  async listLatestBodyByLeadIds(leadIds: string[]): Promise<Map<string, string | null>> {
    const unique = [...new Set(leadIds.filter(Boolean))];
    const result = new Map<string, string | null>();
    if (unique.length === 0) return result;

    const rows = await this.prisma.leadNote.findMany({
      where: { leadId: { in: unique } },
      orderBy: { createdAt: "desc" },
      select: { leadId: true, body: true },
    });

    for (const row of rows) {
      if (result.has(row.leadId)) continue;
      result.set(row.leadId, row.body?.trim() || null);
    }
    return result;
  }

  async createWithAudit(
    data: CreateLeadNoteData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadNote> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.leadNote.create({ data });
      const note = toLeadNote(row);

      const lead = await tx.lead.findUniqueOrThrow({ where: { id: note.leadId } });

      await tx.leadAuditLog.create({
        data: {
          organizationId: lead.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LeadNoteAdded",
          targetType: TARGET_TYPE_LEAD_NOTE,
          targetId: note.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(note),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return note;
    });
  }

  async updateWithAudit(
    id: string,
    body: string,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<LeadNote> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.leadNote.findUniqueOrThrow({ where: { id } });
      const before = toLeadNote(beforeRow);

      const afterRow = await tx.leadNote.update({ where: { id }, data: { body } });
      const after = toLeadNote(afterRow);

      const lead = await tx.lead.findUniqueOrThrow({ where: { id: after.leadId } });

      await tx.leadAuditLog.create({
        data: {
          organizationId: lead.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LeadNoteUpdated",
          targetType: TARGET_TYPE_LEAD_NOTE,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }
}

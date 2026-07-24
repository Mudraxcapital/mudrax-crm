// ============================================================================
// src/modules/telephony/infrastructure/repositories/PrismaCallNoteRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CallNoteRepository,
  CreateCallNoteData,
} from "../../domain/repositories/CallNoteRepository";
import type { CallNote } from "../../domain/entities/CallNote";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { toCallNote } from "../mappers/telephonyMapper";

const TARGET_TYPE_CALL_NOTE = "CallNote";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(note: CallNote): Prisma.InputJsonValue {
  return {
    id: note.id,
    callAttemptId: note.callAttemptId,
    authorUserId: note.authorUserId,
    body: note.body,
  };
}

export class PrismaCallNoteRepository implements CallNoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CallNote | null> {
    const row = await this.prisma.callNote.findUnique({ where: { id } });
    return row ? toCallNote(row) : null;
  }

  async listByCallAttempt(callAttemptId: string): Promise<CallNote[]> {
    const rows = await this.prisma.callNote.findMany({
      where: { callAttemptId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCallNote);
  }

  async createWithAudit(
    data: CreateCallNoteData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallNote> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.callNote.create({ data });
      const note = toCallNote(row);

      const call = await tx.callAttempt.findUniqueOrThrow({ where: { id: note.callAttemptId } });

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: call.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallNoteAdded",
          targetType: TARGET_TYPE_CALL_NOTE,
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
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallNote> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.callNote.findUniqueOrThrow({ where: { id } });
      const before = toCallNote(beforeRow);

      const afterRow = await tx.callNote.update({ where: { id }, data: { body } });
      const after = toCallNote(afterRow);

      const call = await tx.callAttempt.findUniqueOrThrow({ where: { id: after.callAttemptId } });

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: call.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallNoteUpdated",
          targetType: TARGET_TYPE_CALL_NOTE,
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

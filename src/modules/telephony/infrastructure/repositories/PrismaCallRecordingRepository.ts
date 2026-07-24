// ============================================================================
// src/modules/telephony/infrastructure/repositories/PrismaCallRecordingRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CallRecordingRepository,
  CreateCallRecordingData,
  UpdateCallRecordingData,
} from "../../domain/repositories/CallRecordingRepository";
import type { CallRecording } from "../../domain/entities/CallRecording";
import type { TelephonyAuditActor, TelephonyAuditRecord } from "../../domain/entities/TelephonyAuditRecord";
import { toCallRecording, toTelephonyAuditRecord } from "../mappers/telephonyMapper";

const TARGET_TYPE_CALL_RECORDING = "CallRecording";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(recording: CallRecording): Prisma.InputJsonValue {
  return {
    id: recording.id,
    callAttemptId: recording.callAttemptId,
    storageReference: recording.storageReference,
    durationSeconds: recording.durationSeconds,
    providerMetadata: recording.providerMetadata as Prisma.InputJsonValue,
  };
}

export class PrismaCallRecordingRepository implements CallRecordingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CallRecording | null> {
    const row = await this.prisma.callRecording.findUnique({ where: { id } });
    return row ? toCallRecording(row) : null;
  }

  async listByCallAttempt(callAttemptId: string): Promise<CallRecording[]> {
    const rows = await this.prisma.callRecording.findMany({
      where: { callAttemptId },
      orderBy: { startedAt: "desc" },
    });
    return rows.map(toCallRecording);
  }

  async createWithAudit(
    data: CreateCallRecordingData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallRecording> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.callRecording.create({
        data: {
          callAttemptId: data.callAttemptId,
          storageReference: data.storageReference,
          durationSeconds: data.durationSeconds ?? null,
          providerMetadata: (data.providerMetadata ?? undefined) as Prisma.InputJsonValue,
          startedAt: data.startedAt,
          endedAt: data.endedAt ?? null,
        },
      });
      const recording = toCallRecording(row);

      const call = await tx.callAttempt.findUniqueOrThrow({
        where: { id: recording.callAttemptId },
      });

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: call.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallRecordingLogged",
          targetType: TARGET_TYPE_CALL_RECORDING,
          targetId: recording.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(recording),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return recording;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateCallRecordingData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallRecording> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.callRecording.findUniqueOrThrow({ where: { id } });
      const before = toCallRecording(beforeRow);

      const afterRow = await tx.callRecording.update({
        where: { id },
        data: {
          durationSeconds: data.durationSeconds,
          endedAt: data.endedAt,
          providerMetadata: data.providerMetadata as Prisma.InputJsonValue,
        },
      });
      const after = toCallRecording(afterRow);

      const call = await tx.callAttempt.findUniqueOrThrow({ where: { id: after.callAttemptId } });

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: call.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallRecordingUpdated",
          targetType: TARGET_TYPE_CALL_RECORDING,
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

  async listAuditLog(callRecordingId: string): Promise<TelephonyAuditRecord[]> {
    const rows = await this.prisma.telephonyAuditLog.findMany({
      where: { targetType: TARGET_TYPE_CALL_RECORDING, targetId: callRecordingId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toTelephonyAuditRecord);
  }
}

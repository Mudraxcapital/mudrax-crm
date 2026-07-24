// ============================================================================
// src/modules/documents/infrastructure/repositories/PrismaAttachmentRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AttachmentRepository,
  CreateAttachmentData,
} from "../../domain/repositories/AttachmentRepository";
import type { Attachment } from "../../domain/entities/Attachment";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import { toAttachment } from "../mappers/documentsMapper";

const TARGET_TYPE = "Attachment";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(attachment: Attachment): Prisma.InputJsonValue {
  return {
    id: attachment.id,
    organizationId: attachment.organizationId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    checksum: attachment.checksum,
    storageLocationId: attachment.storageLocationId,
    storageKey: attachment.storageKey,
    status: attachment.status,
  };
}

export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Attachment | null> {
    const row = await this.prisma.attachment.findUnique({ where: { id } });
    return row ? toAttachment(row) : null;
  }

  async createWithAudit(
    data: CreateAttachmentData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<Attachment> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.attachment.create({
        data: {
          organizationId: data.organizationId,
          uploadedByUserId: data.uploadedByUserId,
          fileName: data.fileName,
          mimeType: data.mimeType,
          sizeBytes: BigInt(data.sizeBytes),
          checksum: data.checksum,
          storageLocationId: data.storageLocationId,
          storageKey: data.storageKey,
          status: data.status ?? "AVAILABLE",
        },
      });
      const attachment = toAttachment(row);

      await tx.auditTrail.create({
        data: {
          organizationId: attachment.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "AttachmentCreated",
          targetType: TARGET_TYPE,
          targetId: attachment.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(attachment),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return attachment;
    });
  }
}

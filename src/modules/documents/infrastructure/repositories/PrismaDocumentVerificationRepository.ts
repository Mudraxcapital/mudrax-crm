// ============================================================================
// src/modules/documents/infrastructure/repositories/PrismaDocumentVerificationRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateDocumentVerificationData,
  DocumentVerificationRepository,
  ListDocumentVerificationsFilter,
  UpdateVerificationStatusData,
} from "../../domain/repositories/DocumentVerificationRepository";
import type { DocumentVerification } from "../../domain/entities/DocumentVerification";
import type { VerificationStatus } from "../../domain/entities/DocumentVerification";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import { toDocumentVerification } from "../mappers/documentsMapper";

const TARGET_TYPE = "DocumentVerification";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(verification: DocumentVerification): Prisma.InputJsonValue {
  return {
    id: verification.id,
    organizationId: verification.organizationId,
    documentVersionId: verification.documentVersionId,
    method: verification.method,
    status: verification.status,
    verifiedByUserId: verification.verifiedByUserId,
    verifiedAt: verification.verifiedAt?.toISOString() ?? null,
    rejectionReason: verification.rejectionReason,
  };
}

export class PrismaDocumentVerificationRepository implements DocumentVerificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<DocumentVerification | null> {
    const row = await this.prisma.documentVerification.findUnique({ where: { id } });
    return row ? toDocumentVerification(row) : null;
  }

  async findLatestByDocumentVersionId(
    documentVersionId: string,
  ): Promise<DocumentVerification | null> {
    const row = await this.prisma.documentVerification.findFirst({
      where: { documentVersionId },
      orderBy: { createdAt: "desc" },
    });
    return row ? toDocumentVerification(row) : null;
  }

  async findLatestByDocumentVersionIds(
    documentVersionIds: readonly string[],
  ): Promise<DocumentVerification[]> {
    if (documentVersionIds.length === 0) return [];

    const rows = await this.prisma.documentVerification.findMany({
      where: { documentVersionId: { in: [...documentVersionIds] } },
      orderBy: { createdAt: "desc" },
    });

    const latestByVersion = new Map<string, DocumentVerification>();
    for (const row of rows) {
      if (!latestByVersion.has(row.documentVersionId)) {
        latestByVersion.set(row.documentVersionId, toDocumentVerification(row));
      }
    }
    return [...latestByVersion.values()];
  }

  async listByOrganization(
    organizationId: string,
    filter?: ListDocumentVerificationsFilter,
  ): Promise<DocumentVerification[]> {
    const rows = await this.prisma.documentVerification.findMany({
      where: {
        organizationId,
        status: filter?.status,
      },
      orderBy: { createdAt: "desc" },
      take: filter?.limit,
      skip: filter?.offset,
    });
    return rows.map(toDocumentVerification);
  }

  async createWithAudit(
    data: CreateDocumentVerificationData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentVerification> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.documentVerification.create({
        data: {
          organizationId: data.organizationId,
          documentVersionId: data.documentVersionId,
          method: data.method,
          status: "PENDING",
        },
      });
      const verification = toDocumentVerification(row);

      await tx.auditTrail.create({
        data: {
          organizationId: verification.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentVerificationCreated",
          targetType: TARGET_TYPE,
          targetId: verification.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(verification),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return verification;
    });
  }

  async updateStatusWithAudit(
    id: string,
    data: UpdateVerificationStatusData,
    actor: DocumentsAuditActor,
    correlationId?: string | null,
  ): Promise<DocumentVerification> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.documentVerification.findUniqueOrThrow({ where: { id } });
      const before = toDocumentVerification(beforeRow);

      const afterRow = await tx.documentVerification.update({
        where: { id },
        data: {
          status: data.status,
          verifiedByUserId: data.verifiedByUserId,
          verifiedAt: data.verifiedAt,
          rejectionReason: data.rejectionReason,
        },
      });
      const after = toDocumentVerification(afterRow);

      await tx.auditTrail.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "DocumentVerificationStatusChanged",
          targetType: TARGET_TYPE,
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

  async countByStatus(organizationId: string, status: VerificationStatus): Promise<number> {
    return this.prisma.documentVerification.count({
      where: { organizationId, status },
    });
  }
}

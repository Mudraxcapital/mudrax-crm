import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AppendCommunicationLogData,
  CommunicationLogRepository,
  ListCommunicationLogFilter,
} from "../../domain/repositories/CommunicationLogRepository";
import type { CommunicationLogEntry } from "../../domain/entities/CommunicationLogEntry";
import { toCommunicationLogEntry } from "../mappers/notificationsMapper";

const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

export class PrismaCommunicationLogRepository implements CommunicationLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(data: AppendCommunicationLogData): Promise<CommunicationLogEntry> {
    const row = await this.prisma.communicationLog.create({
      data: {
        organizationId: data.organizationId,
        notificationId: data.notificationId,
        notificationDeliveryId: data.notificationDeliveryId ?? null,
        eventType: data.eventType,
        details: (data.details ?? undefined) as Prisma.InputJsonValue | undefined,
        recordHash: PLACEHOLDER_RECORD_HASH,
      },
    });
    return toCommunicationLogEntry(row);
  }

  async list(
    organizationId: string,
    filter?: ListCommunicationLogFilter,
  ): Promise<CommunicationLogEntry[]> {
    const rows = await this.prisma.communicationLog.findMany({
      where: {
        organizationId,
        ...(filter?.notificationId ? { notificationId: filter.notificationId } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toCommunicationLogEntry);
  }

  async listByNotification(notificationId: string): Promise<CommunicationLogEntry[]> {
    const rows = await this.prisma.communicationLog.findMany({
      where: { notificationId },
      orderBy: { occurredAt: "asc" },
    });
    return rows.map(toCommunicationLogEntry);
  }
}

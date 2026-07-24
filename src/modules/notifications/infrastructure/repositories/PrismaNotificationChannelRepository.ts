import type { Prisma, PrismaClient } from "@prisma/client";
import type { NotificationChannelRepository } from "../../domain/repositories/NotificationChannelRepository";
import type { ChannelType } from "../../domain/entities/NotificationTemplate";
import type { NotificationChannel, Provider } from "../../domain/entities/NotificationChannel";
import {
  defaultNullProviderType,
  NULL_PROVIDER_CONFIGURATION,
} from "../../domain/entities/NotificationChannel";
import { toNotificationChannel, toProvider } from "../mappers/notificationsMapper";

export class PrismaNotificationChannelRepository implements NotificationChannelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByOrganizationAndType(
    organizationId: string,
    channelType: ChannelType,
  ): Promise<NotificationChannel | null> {
    const row = await this.prisma.notificationChannel.findUnique({
      where: { organizationId_channelType: { organizationId, channelType } },
    });
    return row ? toNotificationChannel(row) : null;
  }

  async getOrCreateWithNullProvider(
    organizationId: string,
    channelType: "EMAIL" | "SMS" | "WHATSAPP",
  ): Promise<{ channel: NotificationChannel; provider: Provider }> {
    const channelRow = await this.prisma.notificationChannel.upsert({
      where: { organizationId_channelType: { organizationId, channelType } },
      update: {},
      create: {
        organizationId,
        channelType,
        status: "ACTIVE",
      },
    });
    const channel = toNotificationChannel(channelRow);

    const existingProvider = await this.prisma.provider.findFirst({
      where: {
        organizationId,
        channelId: channel.id,
        status: { in: ["REGISTERED", "ACTIVE"] },
      },
      orderBy: { createdAt: "asc" },
    });
    if (existingProvider) {
      return { channel, provider: toProvider(existingProvider) };
    }

    const providerRow = await this.prisma.provider.create({
      data: {
        organizationId,
        channelId: channel.id,
        providerType: defaultNullProviderType(channelType),
        configuration: NULL_PROVIDER_CONFIGURATION as Prisma.InputJsonValue,
        status: "ACTIVE",
      },
    });
    return { channel, provider: toProvider(providerRow) };
  }

  async findActiveProvider(
    organizationId: string,
    channelType: ChannelType,
  ): Promise<Provider | null> {
    if (channelType !== "EMAIL" && channelType !== "SMS" && channelType !== "WHATSAPP") {
      return null;
    }
    const { provider } = await this.getOrCreateWithNullProvider(organizationId, channelType);
    return provider;
  }
}

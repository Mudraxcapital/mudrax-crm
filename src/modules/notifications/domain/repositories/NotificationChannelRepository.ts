// ============================================================================
// src/modules/notifications/domain/repositories/NotificationChannelRepository.ts
//
// Ensures an Organization has an ACTIVE Channel + Null Provider for each
// sendable channel type used by the send path.
// ============================================================================

import type { ChannelType } from "../entities/NotificationTemplate";
import type { NotificationChannel, Provider } from "../entities/NotificationChannel";

export interface NotificationChannelRepository {
  findByOrganizationAndType(
    organizationId: string,
    channelType: ChannelType,
  ): Promise<NotificationChannel | null>;

  getOrCreateWithNullProvider(
    organizationId: string,
    channelType: "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP",
  ): Promise<{ channel: NotificationChannel; provider: Provider }>;

  findActiveProvider(organizationId: string, channelType: ChannelType): Promise<Provider | null>;
}

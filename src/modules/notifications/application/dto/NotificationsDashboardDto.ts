import type { NotificationDto } from "./NotificationDto";
import type { ChannelType } from "../../domain/entities/NotificationTemplate";

export interface ChannelBreakdownDto {
  channelType: ChannelType;
  count: number;
}

export interface NotificationsDashboardDto {
  totalNotifications: number;
  pending: number;
  sent: number;
  failed: number;
  channelBreakdown: ChannelBreakdownDto[];
  recentNotifications: NotificationDto[];
}

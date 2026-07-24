// ============================================================================
// src/modules/notifications/application/ports/NotificationProviderPort.ts
//
// The `INotificationProvider` port ADR 0008 requires all send-domain logic
// to depend on instead of a specific vendor SDK. Vendor-specific code lives
// in src/integrations/notifications/*. This task wires only the Null
// adapter — no SendGrid/Resend/Twilio/Exotel/WhatsApp Business API.
// ============================================================================

import type { SendableChannelType } from "../../domain/entities/NotificationTemplate";

export interface SendNotificationInput {
  organizationId: string;
  channelType: SendableChannelType;
  recipientAddress: string;
  subject?: string | null;
  body: string;
  payload?: Record<string, unknown>;
}

export interface SendNotificationResult {
  providerMessageId: string;
  accepted: boolean;
  failureReason?: string | null;
}

export interface NotificationProviderPort {
  send(input: SendNotificationInput): Promise<SendNotificationResult>;
}

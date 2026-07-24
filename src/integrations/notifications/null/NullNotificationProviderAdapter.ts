// ============================================================================
// src/integrations/notifications/null/NullNotificationProviderAdapter.ts
//
// The only `INotificationProvider` implementation wired today. Fabricates a
// deterministic provider message id without contacting any vendor
// (SendGrid/Resend/Twilio/Exotel/WhatsApp Business API are explicitly
// excluded). A future PR adds a real vendor adapter behind the same port.
// ============================================================================

import { randomUUID } from "node:crypto";
import type {
  NotificationProviderPort,
  SendNotificationInput,
  SendNotificationResult,
} from "@/modules/notifications/application/ports/NotificationProviderPort";

export class NullNotificationProviderAdapter implements NotificationProviderPort {
  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    void input;
    return {
      providerMessageId: `null-provider-${randomUUID()}`,
      accepted: true,
      failureReason: null,
    };
  }
}

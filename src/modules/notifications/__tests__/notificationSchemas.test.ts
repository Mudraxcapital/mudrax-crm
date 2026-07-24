import { describe, expect, it } from "vitest";
import {
  createNotificationTemplateSchema,
  sendNotificationSchema,
  upsertNotificationPreferenceSchema,
} from "../application/validators/notificationSchemas";

describe("notificationSchemas", () => {
  it("accepts a valid Email template create payload", () => {
    const result = createNotificationTemplateSchema.safeParse({
      code: "lead.assigned.email",
      channelType: "EMAIL",
      subject: "Lead assigned",
      body: "Hello {{name}}",
      publish: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unsupported channel type on templates", () => {
    const result = createNotificationTemplateSchema.safeParse({
      code: "push.alert",
      channelType: "PUSH",
      body: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a send Notification payload with retry configuration", () => {
    const result = sendNotificationSchema.safeParse({
      templateId: "00000000-0000-0000-0000-000000000001",
      category: "TRANSACTIONAL",
      recipientType: "USER",
      recipientId: "00000000-0000-0000-0000-000000000002",
      maxRetryAttempts: 2,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a preference upsert", () => {
    const result = upsertNotificationPreferenceSchema.safeParse({
      recipientType: "USER",
      recipientId: "00000000-0000-0000-0000-000000000002",
      eventCategory: "OPERATIONAL",
      channelType: "SMS",
      isEnabled: false,
    });
    expect(result.success).toBe(true);
  });
});

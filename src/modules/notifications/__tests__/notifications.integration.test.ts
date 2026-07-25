import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Notifications module (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createNotificationTemplate: (typeof import("@/modules/notifications"))["createNotificationTemplate"];
  let sendNotification: (typeof import("@/modules/notifications"))["sendNotification"];
  let listNotificationHistory: (typeof import("@/modules/notifications"))["listNotificationHistory"];
  let getNotificationsDashboard: (typeof import("@/modules/notifications"))["getNotificationsDashboard"];
  let listNotificationDeliveries: (typeof import("@/modules/notifications"))["listNotificationDeliveries"];
  let upsertNotificationPreference: (typeof import("@/modules/notifications"))["upsertNotificationPreference"];

  let organizationId: string;
  let userId: string;
  let templateId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const notificationsModule = await import("@/modules/notifications");
    prisma = dbClient.prisma;
    createNotificationTemplate = notificationsModule.createNotificationTemplate;
    sendNotification = notificationsModule.sendNotification;
    listNotificationHistory = notificationsModule.listNotificationHistory;
    getNotificationsDashboard = notificationsModule.getNotificationsDashboard;
    listNotificationDeliveries = notificationsModule.listNotificationDeliveries;
    upsertNotificationPreference = notificationsModule.upsertNotificationPreference;

    const organization = await prisma.organization.upsert({
      where: { code: "MUDRAX" },
      update: {},
      create: {
        name: "Mudrax Capitals",
        code: "MUDRAX",
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
      },
    });
    organizationId = organization.id;

    const uniqueSuffix = Date.now().toString().slice(-6);
    const user = await prisma.user.create({
      data: {
        employeeId: `INTNOT${uniqueSuffix}`,
        fullName: "Integration Test Notifications User",
        email: `int-test-notifications-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userId = user.id;

    const template = await createNotificationTemplate({
      organizationId,
      input: {
        code: `integration.email.${uniqueSuffix}`,
        channelType: "EMAIL",
        subject: "Integration {{name}}",
        body: "Hello {{name}}",
        publish: true,
      },
      actor: { actorType: "USER", actorId: userId },
    });
    templateId = template.id;
  });

  afterAll(async () => {
    // Leave seeded rows for inspection; integration tests are additive.
  });

  it("sends a Notification end-to-end through the Null provider", async () => {
    const notification = await sendNotification({
      organizationId,
      input: {
        templateId,
        category: "TRANSACTIONAL",
        recipientType: "USER",
        recipientId: userId,
        payload: { name: "Integration" },
        maxRetryAttempts: 2,
        processImmediately: true,
      },
      actor: { actorType: "USER", actorId: userId },
    });

    expect(notification.status).toBe("DELIVERED");

    const deliveries = await listNotificationDeliveries(organizationId, notification.id);
    expect(deliveries.length).toBeGreaterThanOrEqual(1);
    expect(deliveries[0]?.status).toBe("SENT");

    const history = await listNotificationHistory(organizationId, notification.id);
    expect(history.some((entry) => entry.eventType === "NotificationDeliverySent")).toBe(true);

    const dashboard = await getNotificationsDashboard(organizationId);
    expect(dashboard.totalNotifications).toBeGreaterThanOrEqual(1);
  });

  it("stores Notification Preferences for a user", async () => {
    const preference = await upsertNotificationPreference({
      organizationId,
      input: {
        recipientType: "USER",
        recipientId: userId,
        eventCategory: "MARKETING",
        channelType: "EMAIL",
        isEnabled: false,
      },
      actor: { actorType: "USER", actorId: userId },
    });

    expect(preference.isEnabled).toBe(false);
    expect(preference.eventCategory).toBe("MARKETING");
  });
});

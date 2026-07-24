import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateNotificationTemplate } from "../application/use-cases/createNotificationTemplate";
import { makeSendNotification } from "../application/use-cases/sendNotification";
import { makeProcessNotificationQueue } from "../application/use-cases/processNotificationQueue";
import { makeRetryNotificationDeliveries } from "../application/use-cases/retryNotificationDeliveries";
import { makeUpsertNotificationPreference } from "../application/use-cases/upsertNotificationPreference";
import { makeGetNotificationsDashboard } from "../application/use-cases/getNotificationsDashboard";
import { NotificationSuppressedByPreferenceError } from "../domain/errors/NotificationErrors";
import {
  FakeCommunicationLogRepository,
  FakeCustomerLookup,
  FakeNotificationChannelRepository,
  FakeNotificationDeliveryRepository,
  FakeNotificationPreferenceRepository,
  FakeNotificationProvider,
  FakeNotificationQueueRepository,
  FakeNotificationRepository,
  FakeNotificationTemplateRepository,
  FakeUserLookup,
} from "./fakeNotificationRepositories";

const ORG_ID = "00000000-0000-0000-0001-000000000000";
const USER_ID = "00000000-0000-0000-0002-000000000000";

describe("Notifications send / queue / retry / dashboard", () => {
  let templates: FakeNotificationTemplateRepository;
  let notifications: FakeNotificationRepository;
  let deliveries: FakeNotificationDeliveryRepository;
  let queues: FakeNotificationQueueRepository;
  let preferences: FakeNotificationPreferenceRepository;
  let channels: FakeNotificationChannelRepository;
  let communicationLog: FakeCommunicationLogRepository;
  let users: FakeUserLookup;
  let customers: FakeCustomerLookup;
  let provider: FakeNotificationProvider;

  beforeEach(() => {
    templates = new FakeNotificationTemplateRepository();
    notifications = new FakeNotificationRepository();
    deliveries = new FakeNotificationDeliveryRepository();
    queues = new FakeNotificationQueueRepository();
    preferences = new FakeNotificationPreferenceRepository();
    channels = new FakeNotificationChannelRepository();
    communicationLog = new FakeCommunicationLogRepository();
    users = new FakeUserLookup();
    customers = new FakeCustomerLookup();
    provider = new FakeNotificationProvider();

    users.users.set(USER_ID, {
      id: USER_ID,
      organizationId: ORG_ID,
      status: "ACTIVE",
      fullName: "Agent",
      email: "agent@example.com",
    });
  });

  async function createPublishedEmailTemplate() {
    const create = makeCreateNotificationTemplate(templates);
    return create({
      organizationId: ORG_ID,
      input: {
        code: "lead.assigned.email",
        channelType: "EMAIL",
        subject: "Hello {{name}}",
        body: "Assigned to {{name}}",
        publish: true,
      },
      actor: { actorType: "USER", actorId: USER_ID },
    });
  }

  function wireSend() {
    const processQueue = makeProcessNotificationQueue(
      notifications,
      queues,
      deliveries,
      templates,
      channels,
      communicationLog,
      provider,
    );
    const send = makeSendNotification(
      templates,
      notifications,
      queues,
      preferences,
      communicationLog,
      users,
      customers,
      processQueue,
    );
    return { send, processQueue };
  }

  it("creates a template, sends Email via Null provider, and reaches DELIVERED", async () => {
    const template = await createPublishedEmailTemplate();
    notifications.templates.set(template.id, (await templates.findById(template.id))!);

    const { send } = wireSend();
    const notification = await send({
      organizationId: ORG_ID,
      input: {
        templateId: template.id,
        category: "TRANSACTIONAL",
        recipientType: "USER",
        recipientId: USER_ID,
        payload: { name: "Aarush" },
        maxRetryAttempts: 3,
        processImmediately: true,
      },
      actor: { actorType: "USER", actorId: USER_ID },
    });

    expect(notification.status).toBe("DELIVERED");
    expect(provider.callCount).toBe(1);
    expect(communicationLog.entries.some((e) => e.eventType === "NotificationDeliverySent")).toBe(
      true,
    );
  });

  it("suppresses Operational sends when preference is disabled", async () => {
    const template = await createPublishedEmailTemplate();
    const upsert = makeUpsertNotificationPreference(preferences, users, customers);
    await upsert({
      organizationId: ORG_ID,
      input: {
        recipientType: "USER",
        recipientId: USER_ID,
        eventCategory: "OPERATIONAL",
        isEnabled: false,
      },
      actor: { actorType: "USER", actorId: USER_ID },
    });

    const { send } = wireSend();
    await expect(
      send({
        organizationId: ORG_ID,
        input: {
          templateId: template.id,
          category: "OPERATIONAL",
          recipientType: "USER",
          recipientId: USER_ID,
          eventCategory: "OPERATIONAL",
          maxRetryAttempts: 1,
          processImmediately: true,
        },
        actor: { actorType: "USER", actorId: USER_ID },
      }),
    ).rejects.toBeInstanceOf(NotificationSuppressedByPreferenceError);
  });

  it("schedules a retry when the provider rejects a send", async () => {
    const template = await createPublishedEmailTemplate();
    notifications.templates.set(template.id, (await templates.findById(template.id))!);
    provider.failNext = true;

    const { send } = wireSend();
    const notification = await send({
      organizationId: ORG_ID,
      input: {
        templateId: template.id,
        category: "TRANSACTIONAL",
        recipientType: "USER",
        recipientId: USER_ID,
        maxRetryAttempts: 2,
        processImmediately: true,
      },
      actor: { actorType: "USER", actorId: USER_ID },
    });

    const deliveryList = await deliveries.listByNotification(notification.id);
    expect(deliveryList[0]?.status).toBe("FAILED");
    expect(deliveries.retries).toHaveLength(1);

    const retry = makeRetryNotificationDeliveries(
      notifications,
      deliveries,
      templates,
      channels,
      communicationLog,
      provider,
    );
    const retried = await retry({
      organizationId: ORG_ID,
      input: { deliveryId: deliveryList[0]!.id, limit: 25 },
      actor: { actorType: "SYSTEM", actorId: null },
      now: new Date(Date.now() + 60_000),
    });

    expect(retried[0]?.status).toBe("SENT");
    expect(retried[0]?.retryOfDeliveryId).toBe(deliveryList[0]!.id);
  });

  it("builds the Notifications Dashboard aggregations", async () => {
    const template = await createPublishedEmailTemplate();
    notifications.templates.set(template.id, (await templates.findById(template.id))!);
    const { send } = wireSend();
    await send({
      organizationId: ORG_ID,
      input: {
        templateId: template.id,
        category: "TRANSACTIONAL",
        recipientType: "USER",
        recipientId: USER_ID,
        maxRetryAttempts: 1,
        processImmediately: true,
      },
      actor: { actorType: "USER", actorId: USER_ID },
    });

    const dashboard = await makeGetNotificationsDashboard(notifications, templates)(ORG_ID);
    expect(dashboard.totalNotifications).toBe(1);
    expect(dashboard.sent).toBe(1);
    expect(dashboard.channelBreakdown[0]?.channelType).toBe("EMAIL");
    expect(dashboard.recentNotifications).toHaveLength(1);
  });
});

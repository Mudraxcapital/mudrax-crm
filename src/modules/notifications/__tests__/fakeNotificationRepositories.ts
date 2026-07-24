import type {
  CreateNotificationTemplateData,
  CreateTemplateVersionData,
  ListNotificationTemplatesFilter,
  NotificationTemplateRepository,
  UpdateNotificationTemplateData,
} from "../domain/repositories/NotificationTemplateRepository";
import type {
  CreateNotificationData,
  ListNotificationsFilter,
  NotificationRepository,
  NotificationsByChannelEntry,
} from "../domain/repositories/NotificationRepository";
import type {
  CreateDeliveryData,
  CreateRetryData,
  NotificationDeliveryRepository,
  UpdateDeliveryStatusData,
} from "../domain/repositories/NotificationDeliveryRepository";
import type {
  EnqueueNotificationData,
  ListQueueEntriesFilter,
  NotificationQueueRepository,
} from "../domain/repositories/NotificationQueueRepository";
import type {
  ListNotificationPreferencesFilter,
  NotificationPreferenceRepository,
  UpsertNotificationPreferenceData,
} from "../domain/repositories/NotificationPreferenceRepository";
import type { NotificationChannelRepository } from "../domain/repositories/NotificationChannelRepository";
import type {
  AppendCommunicationLogData,
  CommunicationLogRepository,
  ListCommunicationLogFilter,
} from "../domain/repositories/CommunicationLogRepository";
import type { NotificationTemplate } from "../domain/entities/NotificationTemplate";
import type { NotificationTemplateVersion } from "../domain/entities/NotificationTemplateVersion";
import type { Notification, NotificationStatus } from "../domain/entities/Notification";
import type { NotificationDelivery } from "../domain/entities/NotificationDelivery";
import type { NotificationRetry } from "../domain/entities/NotificationRetry";
import type {
  NotificationQueue,
  NotificationQueueEntry,
  QueueEntryStatus,
} from "../domain/entities/NotificationQueue";
import { PENDING_QUEUE_ENTRY_STATUSES } from "../domain/entities/NotificationQueue";
import type { NotificationPreference } from "../domain/entities/NotificationPreference";
import type { NotificationChannel, Provider } from "../domain/entities/NotificationChannel";
import {
  defaultNullProviderType,
  NULL_PROVIDER_CONFIGURATION,
} from "../domain/entities/NotificationChannel";
import type { CommunicationLogEntry } from "../domain/entities/CommunicationLogEntry";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../domain/entities/NotificationsAuditRecord";
import type { ChannelType } from "../domain/entities/NotificationTemplate";
import type { RecipientType } from "../domain/entities/Notification";

let nextId = 1;
function makeId(): string {
  return `00000000-0000-0000-000a-${String(nextId++).padStart(12, "0")}`;
}

function recordAudit(
  log: NotificationsAuditRecord[],
  actor: NotificationsAuditActor,
  action: string,
  targetType: string,
  targetId: string,
  organizationId: string,
  correlationId: string | null | undefined,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null,
): void {
  const previous = log[log.length - 1];
  log.push({
    id: makeId(),
    organizationId,
    occurredAt: new Date(),
    actorType: actor.actorType,
    actorId: actor.actorId,
    action,
    targetType,
    targetId,
    correlationId: correlationId ?? null,
    beforeState,
    afterState,
    recordHash: `fake-hash-${log.length}`,
    previousRecordHash: previous?.recordHash ?? null,
  });
}

export class FakeNotificationTemplateRepository implements NotificationTemplateRepository {
  templates = new Map<string, NotificationTemplate>();
  versions = new Map<string, NotificationTemplateVersion>();
  auditLog: NotificationsAuditRecord[] = [];

  async findById(id: string) {
    return this.templates.get(id) ?? null;
  }

  async findByCode(organizationId: string, code: string) {
    return (
      [...this.templates.values()].find(
        (t) => t.organizationId === organizationId && t.code === code,
      ) ?? null
    );
  }

  async list(organizationId: string, filter?: ListNotificationTemplatesFilter) {
    return [...this.templates.values()].filter((t) => {
      if (t.organizationId !== organizationId) return false;
      if (filter?.channelType && t.channelType !== filter.channelType) return false;
      if (filter?.status && t.status !== filter.status) return false;
      if (!filter?.includeArchived && !filter?.status && t.status === "ARCHIVED") return false;
      return true;
    });
  }

  async findVersionById(id: string) {
    return this.versions.get(id) ?? null;
  }

  async listVersions(templateId: string) {
    return [...this.versions.values()]
      .filter((v) => v.templateId === templateId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async findLatestPublishedVersion(templateId: string) {
    return (await this.listVersions(templateId)).find((v) => v.status === "PUBLISHED") ?? null;
  }

  async createWithAudit(
    data: CreateNotificationTemplateData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const template: NotificationTemplate = {
      id: makeId(),
      organizationId: data.organizationId,
      code: data.code,
      channelType: data.channelType,
      status: data.status ?? "DRAFT",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const version: NotificationTemplateVersion = {
      id: makeId(),
      templateId: template.id,
      versionNumber: 1,
      subject: data.subject ?? null,
      body: data.body,
      variables: data.variables ?? null,
      status: "DRAFT",
      publishedAt: null,
      createdAt: new Date(),
    };
    this.templates.set(template.id, template);
    this.versions.set(version.id, version);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationTemplateCreated",
      "NotificationTemplate",
      template.id,
      data.organizationId,
      correlationId,
      null,
      { id: template.id, code: template.code },
    );
    return { template, version };
  }

  async updateWithAudit(
    id: string,
    data: UpdateNotificationTemplateData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const before = this.templates.get(id)!;
    const after = {
      ...before,
      status: data.status ?? before.status,
      updatedAt: new Date(),
    };
    this.templates.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationTemplateUpdated",
      "NotificationTemplate",
      id,
      after.organizationId!,
      correlationId,
      { status: before.status },
      { status: after.status },
    );
    return after;
  }

  async archiveWithAudit(
    id: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const before = this.templates.get(id)!;
    const after = { ...before, status: "ARCHIVED" as const, updatedAt: new Date() };
    this.templates.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationTemplateArchived",
      "NotificationTemplate",
      id,
      after.organizationId!,
      correlationId,
      { status: before.status },
      { status: after.status },
    );
    return after;
  }

  async createVersionWithAudit(
    data: CreateTemplateVersionData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const existing = await this.listVersions(data.templateId);
    const version: NotificationTemplateVersion = {
      id: makeId(),
      templateId: data.templateId,
      versionNumber: (existing[0]?.versionNumber ?? 0) + 1,
      subject: data.subject ?? null,
      body: data.body,
      variables: data.variables ?? null,
      status: data.status ?? "DRAFT",
      publishedAt: null,
      createdAt: new Date(),
    };
    this.versions.set(version.id, version);
    const template = this.templates.get(data.templateId)!;
    recordAudit(
      this.auditLog,
      actor,
      "NotificationTemplateVersionCreated",
      "NotificationTemplateVersion",
      version.id,
      template.organizationId!,
      correlationId,
      null,
      { id: version.id, versionNumber: version.versionNumber },
    );
    return version;
  }

  async publishVersionWithAudit(
    versionId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const version = this.versions.get(versionId)!;
    for (const other of this.versions.values()) {
      if (
        other.templateId === version.templateId &&
        other.status === "PUBLISHED" &&
        other.id !== versionId
      ) {
        this.versions.set(other.id, { ...other, status: "SUPERSEDED" });
      }
    }
    const published = {
      ...version,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    this.versions.set(versionId, published);
    const template = this.templates.get(version.templateId)!;
    recordAudit(
      this.auditLog,
      actor,
      "NotificationTemplateVersionPublished",
      "NotificationTemplateVersion",
      versionId,
      template.organizationId!,
      correlationId,
      null,
      { id: published.id, status: published.status },
    );
    return published;
  }

  async listAuditLog(targetId: string) {
    return this.auditLog.filter((entry) => entry.targetId === targetId);
  }
}

export class FakeNotificationRepository implements NotificationRepository {
  notifications = new Map<string, Notification>();
  auditLog: NotificationsAuditRecord[] = [];
  templates = new Map<string, NotificationTemplate>();

  async findById(id: string) {
    return this.notifications.get(id) ?? null;
  }

  async list(organizationId: string, filter?: ListNotificationsFilter) {
    return [...this.notifications.values()]
      .filter((n) => {
        if (n.organizationId !== organizationId) return false;
        if (filter?.statuses && !filter.statuses.includes(n.status)) return false;
        if (filter?.status && n.status !== filter.status) return false;
        if (filter?.category && n.category !== filter.category) return false;
        if (filter?.templateId && n.templateId !== filter.templateId) return false;
        if (filter?.channelType) {
          const template = this.templates.get(n.templateId);
          if (!template || template.channelType !== filter.channelType) return false;
        }
        return true;
      })
      .slice(filter?.offset ?? 0, (filter?.offset ?? 0) + (filter?.limit ?? 50));
  }

  async count(organizationId: string, filter?: ListNotificationsFilter) {
    return (await this.list(organizationId, { ...filter, limit: 10_000 })).length;
  }

  async listRecent(organizationId: string, limit: number) {
    return this.list(organizationId, { limit });
  }

  async createWithAudit(
    data: CreateNotificationData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const notification: Notification = {
      id: makeId(),
      organizationId: data.organizationId,
      category: data.category,
      templateId: data.templateId,
      templateVersionId: data.templateVersionId,
      recipientType: data.recipientType,
      recipientId: data.recipientId,
      payload: data.payload,
      status: data.status ?? "CREATED",
      batchId: null,
      broadcastId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationCreated",
      "Notification",
      notification.id,
      data.organizationId,
      correlationId,
      null,
      { id: notification.id, status: notification.status },
    );
    return notification;
  }

  async updateStatusWithAudit(
    id: string,
    status: NotificationStatus,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const before = this.notifications.get(id)!;
    const after = { ...before, status, updatedAt: new Date() };
    this.notifications.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationStatusChanged",
      "Notification",
      id,
      after.organizationId,
      correlationId,
      { status: before.status },
      { status: after.status },
    );
    return after;
  }

  async countByChannel(organizationId: string): Promise<NotificationsByChannelEntry[]> {
    const counts = new Map<ChannelType, number>();
    for (const n of this.notifications.values()) {
      if (n.organizationId !== organizationId) continue;
      const template = this.templates.get(n.templateId);
      if (!template) continue;
      counts.set(template.channelType, (counts.get(template.channelType) ?? 0) + 1);
    }
    return [...counts.entries()].map(([channelType, count]) => ({ channelType, count }));
  }

  async listAuditLog(notificationId: string) {
    return this.auditLog.filter((entry) => entry.targetId === notificationId);
  }
}

export class FakeNotificationDeliveryRepository implements NotificationDeliveryRepository {
  deliveries = new Map<string, NotificationDelivery>();
  retries: NotificationRetry[] = [];
  auditLog: NotificationsAuditRecord[] = [];
  notificationOrg = new Map<string, string>();

  async findById(id: string) {
    return this.deliveries.get(id) ?? null;
  }

  async listByNotification(notificationId: string) {
    return [...this.deliveries.values()].filter((d) => d.notificationId === notificationId);
  }

  async listFailedEligibleForRetry(organizationId: string, now: Date, limit = 25) {
    const eligible = this.retries
      .filter((retry) => retry.nextEligibleAt <= now)
      .map((retry) => this.deliveries.get(retry.notificationDeliveryId))
      .filter((d): d is NotificationDelivery => Boolean(d && d.status === "FAILED"))
      .filter((d) => this.notificationOrg.get(d.notificationId) === organizationId)
      .slice(0, limit);
    return eligible;
  }

  async createWithAudit(
    data: CreateDeliveryData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const delivery: NotificationDelivery = {
      id: makeId(),
      notificationId: data.notificationId,
      providerId: data.providerId,
      status: data.status ?? "QUEUED",
      retryOfDeliveryId: data.retryOfDeliveryId ?? null,
      sentAt: null,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deliveries.set(delivery.id, delivery);
    this.notificationOrg.set(data.notificationId, organizationId);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationDeliveryCreated",
      "NotificationDelivery",
      delivery.id,
      organizationId,
      correlationId,
      null,
      { id: delivery.id, status: delivery.status },
    );
    return delivery;
  }

  async updateStatusWithAudit(
    id: string,
    data: UpdateDeliveryStatusData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const before = this.deliveries.get(id)!;
    const after = {
      ...before,
      status: data.status,
      sentAt: data.sentAt ?? before.sentAt,
      deliveredAt: data.deliveredAt ?? before.deliveredAt,
      failureReason: data.failureReason ?? before.failureReason,
      updatedAt: new Date(),
    };
    this.deliveries.set(id, after);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationDeliveryStatusChanged",
      "NotificationDelivery",
      id,
      organizationId,
      correlationId,
      { status: before.status },
      { status: after.status },
    );
    return after;
  }

  async createRetry(data: CreateRetryData) {
    const retry: NotificationRetry = {
      id: makeId(),
      notificationDeliveryId: data.notificationDeliveryId,
      attemptNumber: data.attemptNumber,
      backoffSeconds: data.backoffSeconds,
      nextEligibleAt: data.nextEligibleAt,
      createdAt: new Date(),
    };
    this.retries.push(retry);
    return retry;
  }

  async listRetries(deliveryId: string) {
    return this.retries.filter((r) => r.notificationDeliveryId === deliveryId);
  }

  async countRetryChain(deliveryId: string) {
    let currentId: string | null = deliveryId;
    let count = 0;
    while (currentId) {
      count += 1;
      currentId = this.deliveries.get(currentId)?.retryOfDeliveryId ?? null;
    }
    return count;
  }

  async listAuditLog(deliveryId: string) {
    return this.auditLog.filter((entry) => entry.targetId === deliveryId);
  }
}

export class FakeNotificationQueueRepository implements NotificationQueueRepository {
  queues = new Map<string, NotificationQueue>();
  entries = new Map<string, NotificationQueueEntry>();
  auditLog: NotificationsAuditRecord[] = [];

  private key(org: string, channel: ChannelType, priority: number) {
    return `${org}:${channel}:${priority}`;
  }

  async findById(id: string) {
    return this.queues.get(id) ?? null;
  }

  async getOrCreate(organizationId: string, channelType: ChannelType, priority = 0) {
    const key = this.key(organizationId, channelType, priority);
    const existing = [...this.queues.values()].find(
      (q) =>
        q.organizationId === organizationId &&
        q.channelType === channelType &&
        q.priority === priority,
    );
    if (existing) return existing;
    const queue: NotificationQueue = {
      id: makeId(),
      organizationId,
      channelType,
      priority,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.queues.set(queue.id, queue);
    void key;
    return queue;
  }

  async findEntryById(id: string) {
    return this.entries.get(id) ?? null;
  }

  async listEntries(organizationId: string, filter?: ListQueueEntriesFilter) {
    return [...this.entries.values()]
      .filter((entry) => {
        const queue = this.queues.get(entry.notificationQueueId);
        if (!queue || queue.organizationId !== organizationId) return false;
        if (filter?.statuses && !filter.statuses.includes(entry.status)) return false;
        if (filter?.status && entry.status !== filter.status) return false;
        if (filter?.channelType && queue.channelType !== filter.channelType) return false;
        return true;
      })
      .slice(0, filter?.limit ?? 50);
  }

  async listPendingEntries(organizationId: string, limit = 25, now: Date = new Date()) {
    return (await this.listEntries(organizationId, { limit: 1000 }))
      .filter((entry) => {
        if (!PENDING_QUEUE_ENTRY_STATUSES.includes(entry.status)) return false;
        if (entry.scheduledFor && entry.scheduledFor > now) return false;
        return true;
      })
      .slice(0, limit);
  }

  async enqueueWithAudit(
    data: EnqueueNotificationData,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const queue = await this.getOrCreate(data.organizationId, data.channelType, data.priority ?? 0);
    const entry: NotificationQueueEntry = {
      id: makeId(),
      notificationQueueId: queue.id,
      notificationId: data.notificationId,
      triggerType: data.triggerType ?? "IMMEDIATE",
      scheduledFor: data.scheduledFor ?? null,
      status: data.scheduledFor ? "ENQUEUED" : "ELIGIBLE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.entries.set(entry.id, entry);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationQueueEntryEnqueued",
      "NotificationQueueEntry",
      entry.id,
      data.organizationId,
      correlationId,
      null,
      { id: entry.id, status: entry.status },
    );
    return { queue, entry };
  }

  async updateEntryStatusWithAudit(
    entryId: string,
    status: QueueEntryStatus,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const before = this.entries.get(entryId)!;
    const after = { ...before, status, updatedAt: new Date() };
    this.entries.set(entryId, after);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationQueueEntryStatusChanged",
      "NotificationQueueEntry",
      entryId,
      organizationId,
      correlationId,
      { status: before.status },
      { status: after.status },
    );
    return after;
  }

  async listAuditLog(targetId: string) {
    return this.auditLog.filter((entry) => entry.targetId === targetId);
  }
}

export class FakeNotificationPreferenceRepository implements NotificationPreferenceRepository {
  preferences = new Map<string, NotificationPreference>();
  auditLog: NotificationsAuditRecord[] = [];

  async findById(id: string) {
    return this.preferences.get(id) ?? null;
  }

  async findForRecipient(
    recipientType: RecipientType,
    recipientId: string,
    eventCategory: string,
    channelType?: ChannelType | null,
  ) {
    return (
      [...this.preferences.values()].find(
        (p) =>
          p.recipientType === recipientType &&
          p.recipientId === recipientId &&
          p.eventCategory === eventCategory &&
          p.channelType === (channelType ?? null),
      ) ?? null
    );
  }

  async list(filter?: ListNotificationPreferencesFilter) {
    return [...this.preferences.values()].filter((p) => {
      if (filter?.recipientId && p.recipientId !== filter.recipientId) return false;
      if (filter?.recipientType && p.recipientType !== filter.recipientType) return false;
      if (filter?.eventCategory && p.eventCategory !== filter.eventCategory) return false;
      return true;
    });
  }

  async upsertWithAudit(
    data: UpsertNotificationPreferenceData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ) {
    const existing = await this.findForRecipient(
      data.recipientType,
      data.recipientId,
      data.eventCategory,
      data.channelType ?? null,
    );
    if (existing) {
      const after = {
        ...existing,
        isEnabled: data.isEnabled,
        status: "UPDATED" as const,
        updatedAt: new Date(),
      };
      this.preferences.set(after.id, after);
      recordAudit(
        this.auditLog,
        actor,
        "NotificationPreferenceUpdated",
        "NotificationPreference",
        after.id,
        organizationId,
        correlationId,
        { isEnabled: existing.isEnabled },
        { isEnabled: after.isEnabled },
      );
      return after;
    }
    const created: NotificationPreference = {
      id: makeId(),
      recipientType: data.recipientType,
      recipientId: data.recipientId,
      eventCategory: data.eventCategory,
      channelType: data.channelType ?? null,
      isEnabled: data.isEnabled,
      status: "CREATED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.preferences.set(created.id, created);
    recordAudit(
      this.auditLog,
      actor,
      "NotificationPreferenceCreated",
      "NotificationPreference",
      created.id,
      organizationId,
      correlationId,
      null,
      { id: created.id, isEnabled: created.isEnabled },
    );
    return created;
  }

  async listAuditLog(preferenceId: string) {
    return this.auditLog.filter((entry) => entry.targetId === preferenceId);
  }
}

export class FakeNotificationChannelRepository implements NotificationChannelRepository {
  channels = new Map<string, NotificationChannel>();
  providers = new Map<string, Provider>();

  async findByOrganizationAndType(organizationId: string, channelType: ChannelType) {
    return (
      [...this.channels.values()].find(
        (c) => c.organizationId === organizationId && c.channelType === channelType,
      ) ?? null
    );
  }

  async getOrCreateWithNullProvider(
    organizationId: string,
    channelType: "EMAIL" | "SMS" | "WHATSAPP",
  ) {
    let channel = await this.findByOrganizationAndType(organizationId, channelType);
    if (!channel) {
      channel = {
        id: makeId(),
        organizationId,
        channelType,
        rateLimitPerMinute: null,
        quietHoursStart: null,
        quietHoursEnd: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.channels.set(channel.id, channel);
    }
    let provider = [...this.providers.values()].find((p) => p.channelId === channel!.id);
    if (!provider) {
      provider = {
        id: makeId(),
        organizationId,
        channelId: channel.id,
        providerType: defaultNullProviderType(channelType),
        configuration: NULL_PROVIDER_CONFIGURATION,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.providers.set(provider.id, provider);
    }
    return { channel, provider };
  }

  async findActiveProvider(organizationId: string, channelType: ChannelType) {
    if (channelType !== "EMAIL" && channelType !== "SMS" && channelType !== "WHATSAPP") {
      return null;
    }
    const { provider } = await this.getOrCreateWithNullProvider(organizationId, channelType);
    return provider;
  }
}

export class FakeCommunicationLogRepository implements CommunicationLogRepository {
  entries: CommunicationLogEntry[] = [];

  async append(data: AppendCommunicationLogData) {
    const entry: CommunicationLogEntry = {
      id: makeId(),
      organizationId: data.organizationId,
      notificationId: data.notificationId,
      notificationDeliveryId: data.notificationDeliveryId ?? null,
      eventType: data.eventType,
      details: data.details ?? null,
      occurredAt: new Date(),
      recordHash: `fake-comm-${this.entries.length + 1}`,
      previousRecordHash: this.entries[this.entries.length - 1]?.recordHash ?? null,
    };
    this.entries.push(entry);
    return entry;
  }

  async list(organizationId: string, filter?: ListCommunicationLogFilter) {
    return this.entries
      .filter((e) => e.organizationId === organizationId)
      .filter((e) => !filter?.notificationId || e.notificationId === filter.notificationId)
      .slice(0, filter?.limit ?? 50);
  }

  async listByNotification(notificationId: string) {
    return this.entries.filter((e) => e.notificationId === notificationId);
  }
}

export class FakeNotificationProvider {
  callCount = 0;
  failNext = false;

  async send() {
    this.callCount += 1;
    if (this.failNext) {
      this.failNext = false;
      return {
        providerMessageId: `fake-fail-${this.callCount}`,
        accepted: false,
        failureReason: "Simulated provider failure",
      };
    }
    return {
      providerMessageId: `fake-provider-${this.callCount}`,
      accepted: true,
      failureReason: null,
    };
  }
}

export class FakeUserLookup {
  users = new Map<
    string,
    { id: string; organizationId: string; status: string; fullName: string; email: string | null }
  >();
  async findById(userId: string) {
    return this.users.get(userId) ?? null;
  }
}

export class FakeCustomerLookup {
  customers = new Map<
    string,
    { id: string; organizationId: string; email: string | null; phone: string | null }
  >();
  async findById(customerId: string) {
    return this.customers.get(customerId) ?? null;
  }
}

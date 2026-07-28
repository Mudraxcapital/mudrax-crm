import { describe, expect, it } from "vitest";
import { applyFieldMappings, hashSecret, verifySecret } from "../application/services/secrets";
import { makeEnableConnection, makeSaveFieldMappings } from "../application/use-cases/manageConnections";
import { makeCreateWebhook, makeRevokeWebhook } from "../application/use-cases/manageWebhooks";
import {
  makeReceiveRestApiLead,
  makeReceiveWebhookLead,
  resolveLeadCenterSource,
} from "../application/use-cases/receiveInboundLead";
import type { IntegrationsRepository } from "../domain/repositories/IntegrationsRepository";
import type { ApiKeyPort } from "../application/ports/ApiKeyPort";
import type {
  FieldMapping,
  IntegrationConnection,
  WebhookEndpoint,
} from "../domain/entities/IntegrationConnection";
import { getIntegrationCatalog, listInboundLeadIntegrations } from "../catalog";
import { LEAD_CENTER_SOURCE_CODES } from "@/modules/lead-center/catalog";
import { IntegrationCatalogError } from "../domain/errors/IntegrationsErrors";

function fakeRepo(): IntegrationsRepository & {
  connections: Map<string, IntegrationConnection>;
  mappings: Map<string, FieldMapping[]>;
  webhooks: Map<string, WebhookEndpoint>;
} {
  const connections = new Map<string, IntegrationConnection>();
  const mappings = new Map<string, FieldMapping[]>();
  const webhooks = new Map<string, WebhookEndpoint>();
  let n = 1;
  const id = () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`;

  return {
    connections,
    mappings,
    webhooks,
    async listConnections(organizationId) {
      return [...connections.values()].filter((c) => c.organizationId === organizationId);
    },
    async findConnectionById(connectionId) {
      return connections.get(connectionId) ?? null;
    },
    async findConnectionByCode(organizationId, catalogCode) {
      return (
        [...connections.values()].find(
          (c) => c.organizationId === organizationId && c.catalogCode === catalogCode,
        ) ?? null
      );
    },
    async createConnection(data) {
      const now = new Date();
      const row: IntegrationConnection = {
        id: id(),
        organizationId: data.organizationId,
        catalogCode: data.catalogCode,
        displayName: data.displayName,
        status: data.status ?? "DISABLED",
        leadCenterSource: data.leadCenterSource ?? null,
        config: data.config ?? null,
        credentialsRef: data.credentialsRef ?? null,
        createdByUserId: data.createdByUserId ?? null,
        updatedByUserId: null,
        lastSyncedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      connections.set(row.id, row);
      return row;
    },
    async updateConnection(connectionId, data) {
      const row = connections.get(connectionId)!;
      Object.assign(row, data);
      row.updatedAt = new Date();
      return row;
    },
    async listFieldMappings(connectionId) {
      return mappings.get(connectionId) ?? [];
    },
    async replaceFieldMappings(connectionId, organizationId, rows) {
      const now = new Date();
      const saved = rows.map((row, index) => ({
        id: id(),
        connectionId,
        organizationId,
        externalField: row.externalField,
        internalField: row.internalField,
        transform: row.transform ?? null,
        isRequired: row.isRequired ?? false,
        sortOrder: row.sortOrder ?? index,
        createdAt: now,
        updatedAt: now,
      }));
      mappings.set(connectionId, saved);
      return saved;
    },
    async listWebhooks(organizationId) {
      return [...webhooks.values()].filter((w) => w.organizationId === organizationId);
    },
    async findWebhookById(webhookId) {
      return webhooks.get(webhookId) ?? null;
    },
    async findWebhookByPathToken(pathToken) {
      return [...webhooks.values()].find((w) => w.pathToken === pathToken) ?? null;
    },
    async createWebhook(data) {
      const now = new Date();
      const row: WebhookEndpoint = {
        id: id(),
        organizationId: data.organizationId,
        connectionId: data.connectionId ?? null,
        name: data.name,
        pathToken: data.pathToken,
        secretHash: data.secretHash,
        secretPrefix: data.secretPrefix,
        status: "ACTIVE",
        leadCenterSource: data.leadCenterSource ?? null,
        lastReceivedAt: null,
        receiveCount: 0,
        createdByUserId: data.createdByUserId ?? null,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      webhooks.set(row.id, row);
      return row;
    },
    async updateWebhookStatus(webhookId, status, revokedAt) {
      const row = webhooks.get(webhookId)!;
      row.status = status;
      if (revokedAt !== undefined) row.revokedAt = revokedAt;
      return row;
    },
    async recordWebhookReceive(webhookId) {
      const row = webhooks.get(webhookId)!;
      row.receiveCount += 1;
      row.lastReceivedAt = new Date();
    },
    async appendAudit() {},
  };
}

describe("integrations catalog", () => {
  it("surfaces Facebook as available Meta Lead Ads connector", () => {
    const catalog = getIntegrationCatalog();
    expect(catalog.map((e) => e.code).sort()).toEqual(
      ["facebook_lead_ads", "google_ads_lead_forms", "whatsapp_business"].sort(),
    );
    expect(catalog.find((e) => e.code === "facebook_lead_ads")?.available).toBe(true);
    expect(catalog.find((e) => e.code === "google_ads_lead_forms")?.available).toBe(false);
    expect(catalog.find((e) => e.code === "whatsapp_business")?.available).toBe(false);
  });

  it("keeps inbound lead integrations aligned with Lead Center sources", () => {
    for (const entry of listInboundLeadIntegrations()) {
      expect(LEAD_CENTER_SOURCE_CODES).toContain(entry.leadCenterSource);
    }
  });
});

describe("secrets + mappings", () => {
  it("hashes and verifies secrets", () => {
    const hash = hashSecret("whsec_test");
    expect(verifySecret("whsec_test", hash)).toBe(true);
    expect(verifySecret("wrong", hash)).toBe(false);
  });

  it("applies field mappings", () => {
    const mapped = applyFieldMappings(
      { Name: "A", mobile: "99", skip: true },
      [
        { externalField: "Name", internalField: "full_name" },
        { externalField: "mobile", internalField: "phone" },
      ],
    );
    expect(mapped.full_name).toBe("A");
    expect(mapped.phone).toBe("99");
  });
});

describe("connections + webhooks", () => {
  it("rejects enabling Google until the connector is available", async () => {
    const repository = fakeRepo();
    const enable = makeEnableConnection(repository);
    await expect(
      enable({
        organizationId: "org-1",
        catalogCode: "google_ads_lead_forms",
        actor: { type: "USER", id: "u1" },
      }),
    ).rejects.toThrow(/not available yet/);
  });

  it("enables Facebook Lead Ads with default mappings", async () => {
    const repository = fakeRepo();
    const enable = makeEnableConnection(repository);
    const connection = await enable({
      organizationId: "org-1",
      catalogCode: "facebook_lead_ads",
      actor: { type: "USER", id: "u1" },
    });
    expect(connection.status).toBe("ENABLED");
    expect(connection.leadCenterSource).toBe("FACEBOOK_LEAD_ADS");
    expect((await repository.listFieldMappings(connection.id)).length).toBeGreaterThan(0);
  });

  it("saves field mappings for an existing connection", async () => {
    const repository = fakeRepo();
    const connection = await repository.createConnection({
      organizationId: "org-1",
      catalogCode: "facebook_lead_ads",
      displayName: "Facebook Lead Ads",
      status: "ENABLED",
      leadCenterSource: "FACEBOOK_LEAD_ADS",
      createdByUserId: "u1",
    });
    const save = makeSaveFieldMappings(repository);
    const saved = await save({
      organizationId: "org-1",
      connectionId: connection.id,
      actor: { type: "USER", id: "u1" },
      mappings: [{ externalField: "fullname", internalField: "phone" }],
    });
    expect(saved).toHaveLength(1);
  });

  it("creates and revokes webhooks; receive validates secret", async () => {
    const repository = fakeRepo();
    const create = makeCreateWebhook(repository);
    const created = await create({
      organizationId: "org-1",
      name: "Forms",
      actor: { type: "USER", id: "u1" },
      leadCenterSource: "FACEBOOK_LEAD_ADS",
    });
    expect(created.plaintextSecret.startsWith("whsec_")).toBe(true);

    let ingested = 0;
    const receive = makeReceiveWebhookLead(repository, {
      async ingest() {
        ingested += 1;
        return { storedCount: 1, duplicateCount: 0, invalidCount: 0, batchId: "b1" };
      },
    });

    await expect(
      receive({
        pathToken: created.webhook.pathToken,
        secretHeader: "bad",
        body: { name: "X", phone: "9000000000" },
      }),
    ).rejects.toThrow(/Invalid webhook secret/);

    const result = await receive({
      pathToken: created.webhook.pathToken,
      secretHeader: created.plaintextSecret,
      body: { name: "X", phone: "9000000000" },
    });
    expect(result.storedCount).toBe(1);
    expect(ingested).toBe(1);

    const revoke = makeRevokeWebhook(repository);
    const revoked = await revoke({
      organizationId: "org-1",
      webhookId: created.webhook.id,
      actor: { type: "USER", id: "u1" },
    });
    expect(revoked.status).toBe("REVOKED");
  });
});

describe("resolveLeadCenterSource + REST receive", () => {
  it("rejects retired source codes", () => {
    expect(() => resolveLeadCenterSource("REST_API")).toThrow(IntegrationCatalogError);
    expect(() => resolveLeadCenterSource("WEBSITE_FORMS")).toThrow(IntegrationCatalogError);
    expect(resolveLeadCenterSource("FACEBOOK_LEAD_ADS")).toBe("FACEBOOK_LEAD_ADS");
  });

  it("ingests REST leads when body provides a valid sourceCode", async () => {
    const repository = fakeRepo();
    const apiKeys: ApiKeyPort = {
      async listForOrganizationOwner() {
        return [];
      },
      async create() {
        throw new Error("unused");
      },
      async revoke() {
        return null;
      },
      async findActiveByPlaintext(plaintext) {
        if (plaintext !== "mxk_test") return null;
        return {
          id: "key-1",
          ownerUserId: "u1",
          integrationRef: "rest_api",
          dataScope: "ORGANIZATION",
        };
      },
      async touchLastUsed() {},
    };

    let ingestedSource: string | null = null;
    const receive = makeReceiveRestApiLead(apiKeys, repository, {
      async ingest(input) {
        ingestedSource = input.sourceCode;
        return { storedCount: 1, duplicateCount: 0, invalidCount: 0, batchId: "b1" };
      },
    });

    const result = await receive({
      apiKeyHeader: "Bearer mxk_test",
      body: {
        sourceCode: "GOOGLE_ADS",
        name: "Priya",
        phone: "9000000001",
      },
      organizationIdResolver: async () => "org-1",
    });

    expect(result.storedCount).toBe(1);
    expect(ingestedSource).toBe("GOOGLE_ADS");
  });

  it("rejects REST leads without a valid Lead Center source", async () => {
    const repository = fakeRepo();
    const apiKeys: ApiKeyPort = {
      async listForOrganizationOwner() {
        return [];
      },
      async create() {
        throw new Error("unused");
      },
      async revoke() {
        return null;
      },
      async findActiveByPlaintext() {
        return {
          id: "key-1",
          ownerUserId: "u1",
          integrationRef: "rest_api",
          dataScope: "ORGANIZATION",
        };
      },
      async touchLastUsed() {},
    };

    const receive = makeReceiveRestApiLead(apiKeys, repository, {
      async ingest() {
        return { storedCount: 1, duplicateCount: 0, invalidCount: 0, batchId: "b1" };
      },
    });

    await expect(
      receive({
        apiKeyHeader: "mxk_test",
        body: { name: "X", phone: "9000000000" },
        organizationIdResolver: async () => "org-1",
      }),
    ).rejects.toThrow(/REST lead source must be one of/);
  });
});

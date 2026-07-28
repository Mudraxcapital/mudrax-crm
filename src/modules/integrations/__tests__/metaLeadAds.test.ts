import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  extractMetaLeadgenEvents,
  fieldDataToRecord,
  fetchMetaLeadById,
  verifyMetaSignature,
  verifyMetaWebhookSubscription,
} from "@/integrations/facebook/metaLeadAdsAdapter";
import { makeReceiveMetaLeadAds, makeVerifyMetaLeadAdsWebhook } from "../application/use-cases/receiveMetaLeadAds";
import type { IntegrationsRepository } from "../domain/repositories/IntegrationsRepository";
import type {
  FieldMapping,
  IntegrationConnection,
} from "../domain/entities/IntegrationConnection";

function fakeRepo(connection?: IntegrationConnection): IntegrationsRepository & {
  connections: Map<string, IntegrationConnection>;
} {
  const connections = new Map<string, IntegrationConnection>();
  const mappings = new Map<string, FieldMapping[]>();
  if (connection) connections.set(connection.id, connection);

  return {
    connections,
    async listConnections(organizationId) {
      return [...connections.values()].filter((c) => c.organizationId === organizationId);
    },
    async findConnectionById(id) {
      return connections.get(id) ?? null;
    },
    async findConnectionByCode(organizationId, catalogCode) {
      return (
        [...connections.values()].find(
          (c) => c.organizationId === organizationId && c.catalogCode === catalogCode,
        ) ?? null
      );
    },
    async createConnection(data) {
      const row: IntegrationConnection = {
        id: "conn-1",
        organizationId: data.organizationId,
        catalogCode: data.catalogCode,
        displayName: data.displayName,
        status: data.status ?? "ENABLED",
        leadCenterSource: data.leadCenterSource ?? null,
        config: data.config ?? null,
        credentialsRef: null,
        createdByUserId: null,
        updatedByUserId: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      connections.set(row.id, row);
      return row;
    },
    async updateConnection(id, data) {
      const row = connections.get(id)!;
      Object.assign(row, data);
      return row;
    },
    async listFieldMappings(connectionId) {
      return mappings.get(connectionId) ?? [];
    },
    async replaceFieldMappings() {
      return [];
    },
    async listWebhooks() {
      return [];
    },
    async findWebhookById() {
      return null;
    },
    async findWebhookByPathToken() {
      return null;
    },
    async createWebhook() {
      throw new Error("unused");
    },
    async updateWebhookStatus() {
      throw new Error("unused");
    },
    async recordWebhookReceive() {},
    async appendAudit() {},
  };
}

describe("metaLeadAdsAdapter", () => {
  it("verifies subscription challenge", () => {
    expect(
      verifyMetaWebhookSubscription({
        mode: "subscribe",
        verifyToken: "tok",
        challenge: "12345",
        expectedVerifyToken: "tok",
      }),
    ).toBe("12345");
    expect(
      verifyMetaWebhookSubscription({
        mode: "subscribe",
        verifyToken: "bad",
        challenge: "12345",
        expectedVerifyToken: "tok",
      }),
    ).toBeNull();
  });

  it("verifies X-Hub-Signature-256", () => {
    const body = '{"object":"page"}';
    const secret = "app-secret";
    const sig = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, sig, secret)).toBe(true);
    expect(verifyMetaSignature(body, "sha256=deadbeef", secret)).toBe(false);
  });

  it("extracts leadgen events and flattens field_data", () => {
    const events = extractMetaLeadgenEvents({
      object: "page",
      entry: [
        {
          id: "page-1",
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: "lead-99",
                page_id: "page-1",
                form_id: "form-1",
                ad_id: "ad-1",
              },
            },
          ],
        },
      ],
    });
    expect(events).toEqual([
      {
        leadgenId: "lead-99",
        pageId: "page-1",
        formId: "form-1",
        adId: "ad-1",
        createdTime: null,
      },
    ]);
    expect(
      fieldDataToRecord([
        { name: "full_name", values: ["Ada Lovelace"] },
        { name: "phone_number", values: ["9876543210"] },
      ]),
    ).toEqual({ full_name: "Ada Lovelace", phone_number: "9876543210" });
  });

  it("fetches lead details from Graph API", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: "lead-99",
          field_data: [
            { name: "email", values: ["ada@example.com"] },
            { name: "full_name", values: ["Ada"] },
          ],
        }),
        { status: 200 },
      );
    const result = await fetchMetaLeadById({
      leadgenId: "lead-99",
      pageAccessToken: "token",
      fetchImpl,
    });
    expect(result.raw.email).toBe("ada@example.com");
    expect(result.raw.full_name).toBe("Ada");
  });
});

describe("receiveMetaLeadAds", () => {
  const connection: IntegrationConnection = {
    id: "conn-meta",
    organizationId: "org-1",
    catalogCode: "facebook_lead_ads",
    displayName: "Facebook Lead Ads",
    status: "ENABLED",
    leadCenterSource: "FACEBOOK_LEAD_ADS",
    config: {
      pageId: "page-1",
      verifyToken: "verify-me",
      pageAccessToken: "page-token",
      appSecret: "app-secret",
    },
    credentialsRef: null,
    createdByUserId: null,
    updatedByUserId: null,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("returns hub challenge when verify token matches", async () => {
    const verify = makeVerifyMetaLeadAdsWebhook(fakeRepo(connection));
    await expect(
      verify({
        organizationId: "org-1",
        mode: "subscribe",
        verifyToken: "verify-me",
        challenge: "challenge-9",
      }),
    ).resolves.toBe("challenge-9");
  });

  it("ingests mapped leads from Meta webhook payload", async () => {
    const repository = fakeRepo(connection);
    const body = JSON.stringify({
      object: "page",
      entry: [
        {
          id: "page-1",
          changes: [
            {
              field: "leadgen",
              value: { leadgen_id: "lead-99", page_id: "page-1", form_id: "form-1" },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;

    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: "lead-99",
          form_id: "form-1",
          field_data: [
            { name: "full_name", values: ["Ada Lovelace"] },
            { name: "phone_number", values: ["9876543210"] },
            { name: "email", values: ["ada@example.com"] },
          ],
        }),
        { status: 200 },
      );

    const receive = makeReceiveMetaLeadAds(
      repository,
      {
        async ingest(input) {
          expect(input.sourceCode).toBe("FACEBOOK_LEAD_ADS");
          expect(input.rawLeads[0]?.raw.full_name).toBe("Ada Lovelace");
          expect(input.rawLeads[0]?.raw.phone).toBe("9876543210");
          return { storedCount: 1, duplicateCount: 0, invalidCount: 0, batchId: "batch-1" };
        },
      },
      fetchImpl,
    );

    const result = await receive({
      organizationId: "org-1",
      rawBody: body,
      signatureHeader: signature,
      payload: JSON.parse(body),
    });
    expect(result.storedCount).toBe(1);
    expect(result.processed).toBe(1);
  });
});

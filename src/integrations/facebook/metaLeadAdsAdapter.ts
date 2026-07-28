// ============================================================================
// src/integrations/facebook/metaLeadAdsAdapter.ts
//
// Meta Lead Ads protocol adapter: webhook verify/signature, leadgen parse,
// Graph API lead fetch, field_data → flat record. No CRM business rules.
// ============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  MetaLeadgenEvent,
  MetaLeadGraphResponse,
  MetaWebhookPayload,
} from "./metaLeadAdsTypes";

const DEFAULT_GRAPH_VERSION = "v21.0";

export function resolveMetaGraphVersion(override?: string | null): string {
  return (
    override?.trim() ||
    process.env.META_GRAPH_API_VERSION?.trim() ||
    process.env.FACEBOOK_GRAPH_API_VERSION?.trim() ||
    DEFAULT_GRAPH_VERSION
  );
}

/** Meta webhook subscription verification (hub.challenge). */
export function verifyMetaWebhookSubscription(input: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
  expectedVerifyToken: string;
}): string | null {
  if (input.mode !== "subscribe") return null;
  if (!input.verifyToken || !input.challenge) return null;
  if (input.verifyToken !== input.expectedVerifyToken) return null;
  return input.challenge;
}

/** Validate `X-Hub-Signature-256: sha256=<hex>` when an app secret is configured. */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice("sha256=".length).trim();
  const actualHex = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(actualHex, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Extract leadgen events from a Meta page webhook payload. */
export function extractMetaLeadgenEvents(payload: unknown): MetaLeadgenEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as MetaWebhookPayload;
  if (body.object !== "page" || !Array.isArray(body.entry)) return [];

  const events: MetaLeadgenEvent[] = [];
  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id?.trim();
      if (!leadgenId) continue;
      events.push({
        leadgenId,
        pageId: change.value?.page_id?.trim() || entry.id?.trim() || null,
        formId: change.value?.form_id?.trim() || null,
        adId: change.value?.ad_id?.trim() || null,
        createdTime: change.value?.created_time ?? null,
      });
    }
  }
  return events;
}

/** Flatten Graph API `field_data` into a simple key → value map. */
export function fieldDataToRecord(
  fieldData: Array<{ name: string; values: string[] }> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fieldData ?? []) {
    const name = field.name?.trim();
    if (!name) continue;
    const values = (field.values ?? []).map((v) => String(v).trim()).filter(Boolean);
    if (values.length === 0) continue;
    out[name] = values.length === 1 ? values[0] : values;
  }
  return out;
}

export async function fetchMetaLeadById(input: {
  leadgenId: string;
  pageAccessToken: string;
  graphVersion?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<{ raw: Record<string, unknown>; graph: MetaLeadGraphResponse }> {
  const version = resolveMetaGraphVersion(input.graphVersion);
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(input.leadgenId)}`);
  url.searchParams.set("access_token", input.pageAccessToken);
  url.searchParams.set("fields", "id,created_time,ad_id,form_id,field_data");

  const fetchFn = input.fetchImpl ?? fetch;
  const response = await fetchFn(url.toString(), { method: "GET" });
  const graph = (await response.json()) as MetaLeadGraphResponse;

  if (!response.ok || graph.error) {
    const message = graph.error?.message ?? `Meta Graph API HTTP ${response.status}`;
    throw new Error(message);
  }

  const fieldRecord = fieldDataToRecord(graph.field_data);
  return {
    graph,
    raw: {
      ...fieldRecord,
      meta_leadgen_id: graph.id ?? input.leadgenId,
      meta_form_id: graph.form_id ?? null,
      meta_ad_id: graph.ad_id ?? null,
      meta_created_time: graph.created_time ?? null,
    },
  };
}

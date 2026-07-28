// ============================================================================
// src/modules/lead-center/application/services/normalizeInboundLead.ts
//
// Source-agnostic normalization step of the Lead Ingestion Pipeline.
// ============================================================================

export interface RawInboundLead {
  /** Connector-local row number or sequence (optional). */
  rowNumber?: number;
  raw: Record<string, unknown>;
}

export interface NormalizedInboundLead {
  rowNumber: number;
  fullName: string;
  phone: string;
  email: string;
  campaignNameHint: string | null;
  tags: string[];
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
}

function pick(raw: Record<string, unknown>, ...keys: string[]): string {
  const lower = new Map(
    Object.entries(raw).map(([k, v]) => [k.toLowerCase().replace(/[\s_-]+/g, ""), v]),
  );
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, "");
    const hit = lower.get(normalizedKey);
    if (hit != null && String(hit).trim()) return String(hit).trim();
  }
  return "";
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseTags(raw: Record<string, unknown>): string[] {
  const value = pick(raw, "tags", "tag", "labels");
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Normalize a single inbound payload into Lead Center fields. */
export function normalizeInboundLead(
  input: RawInboundLead,
  rowNumber = 1,
): NormalizedInboundLead {
  const raw = input.raw;
  const firstName = pick(raw, "first_name", "firstname", "first name");
  const lastName = pick(raw, "last_name", "lastname", "last name");
  const fullName =
    pick(
      raw,
      "full_name",
      "fullName",
      "name",
      "lead_name",
      "customer_name",
      "full name",
    ) || [firstName, lastName].filter(Boolean).join(" ");
  const phoneRaw = pick(
    raw,
    "phone",
    "phone_number",
    "phoneSnapshot",
    "mobile",
    "mobile_number",
    "lead_id",
    "leadid",
  );
  const emailRaw = pick(raw, "email", "emailSnapshot", "email_address");
  const campaignNameHint =
    pick(raw, "campaign", "campaign_name", "campaignName", "ad_name", "form_name") || null;

  const phone = normalizePhone(phoneRaw);
  const email = normalizeEmail(emailRaw);
  const tags = parseTags(raw);

  return {
    rowNumber: input.rowNumber ?? rowNumber,
    fullName,
    phone,
    email,
    campaignNameHint,
    tags,
    rawPayload: raw,
    normalizedPayload: {
      full_name: fullName,
      phone,
      email,
      campaign: campaignNameHint,
      tags,
    },
  };
}

export function normalizeInboundLeads(inputs: RawInboundLead[]): NormalizedInboundLead[] {
  return inputs.map((input, index) => normalizeInboundLead(input, index + 1));
}

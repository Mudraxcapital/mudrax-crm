import { describe, expect, it } from "vitest";
import { getIntegrationCatalog, listInboundLeadIntegrations } from "../catalog";
import { LEAD_CENTER_SOURCE_CODES } from "@/modules/lead-center/catalog";

describe("integrations catalog", () => {
  it("exposes only Facebook, Google, and WhatsApp", () => {
    const catalog = getIntegrationCatalog();
    expect(catalog.map((e) => e.code).sort()).toEqual([
      "facebook_lead_ads",
      "google_ads_lead_forms",
      "whatsapp_business",
    ].sort());
    expect(catalog.every((entry) => entry.label && entry.description)).toBe(true);
  });

  it("keeps inbound lead integrations aligned with Lead Center sources", () => {
    const inbound = listInboundLeadIntegrations();
    expect(inbound.length).toBe(3);
    for (const entry of inbound) {
      expect(entry.leadCenterSource).toBeTruthy();
      expect(LEAD_CENTER_SOURCE_CODES).toContain(entry.leadCenterSource);
    }
  });
});

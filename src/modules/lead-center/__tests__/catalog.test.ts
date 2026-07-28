import { describe, expect, it } from "vitest";
import { FakeLeadCenterRepository } from "./fakeLeadCenterRepository";
import { makeIngestLeads } from "../application/use-cases/ingestLeads";
import { normalizeInboundLead } from "../application/services/normalizeInboundLead";
import { validateNormalizedLead } from "../application/services/validateNormalizedLead";
import type { ExistingLeadLookupPort } from "../application/ports/ExistingLeadLookupPort";
import type { ClassifyDuplicatesPort } from "../application/ports/ClassifyDuplicatesPort";
import { classifyImportDuplicates } from "@/modules/leads/application/use-cases/detectImportDuplicates";
import {
  LEAD_CENTER_IMPORT_SCOPES,
  LEAD_CENTER_SOURCE_CODES,
  LEAD_CENTER_SOURCE_LABELS,
  sourceCodesForImportScope,
} from "../catalog";

const classifyDuplicates: ClassifyDuplicatesPort = {
  classify: (input) => classifyImportDuplicates(input),
};

describe("lead-center public catalog", () => {
  it("exposes only Facebook, Google, and WhatsApp", () => {
    expect([...LEAD_CENTER_SOURCE_CODES].sort()).toEqual(
      ["FACEBOOK_LEAD_ADS", "GOOGLE_ADS", "WHATSAPP_BUSINESS"].sort(),
    );
    for (const code of LEAD_CENTER_SOURCE_CODES) {
      expect(LEAD_CENTER_SOURCE_LABELS[code]).toBeTruthy();
    }
    expect(LEAD_CENTER_IMPORT_SCOPES).toContain("ALL");
    expect(sourceCodesForImportScope("ALL")).toHaveLength(3);
    expect(sourceCodesForImportScope("FACEBOOK_LEAD_ADS")).toEqual(["FACEBOOK_LEAD_ADS"]);
  });
});

describe("normalize + validate", () => {
  it("normalizes common field aliases", () => {
    const normalized = normalizeInboundLead({
      raw: { Name: "Rahul Sharma", Mobile: "+91 98765 43210", "Email Address": "Rahul@Example.com" },
    });
    expect(normalized.fullName).toBe("Rahul Sharma");
    expect(normalized.phone).toBe("9876543210");
    expect(normalized.email).toBe("rahul@example.com");
  });

  it("flags invalid rows without phone or email", () => {
    const normalized = normalizeInboundLead({ raw: { name: "A" } });
    const validated = validateNormalizedLead(normalized);
    expect(validated.validationStatus).toBe("INVALID");
    expect(validated.validationErrors.length).toBeGreaterThan(0);
  });
});

describe("ingestLeads pipeline", () => {
  it("stores normalized leads and marks CRM duplicates", async () => {
    const repository = new FakeLeadCenterRepository();
    const existingLeadLookup: ExistingLeadLookupPort = {
      async listForDuplicateScan() {
        return [
          {
            id: "lead-1",
            customerId: "cust-1",
            fullNameSnapshot: "Rahul Sharma",
            phoneSnapshot: "9876543210",
            emailSnapshot: "rahul@example.com",
            currentStageId: "stage-1",
            currentStageName: "Fresh",
            stageBucket: "INITIAL",
            stageSortOrder: 1,
            updatedAt: new Date(),
          },
        ];
      },
    };

    const ingestLeads = makeIngestLeads(repository, existingLeadLookup, classifyDuplicates);
    const result = await ingestLeads({
      organizationId: "org-1",
      sourceCode: "FACEBOOK_LEAD_ADS",
      actor: { type: "USER", id: "user-1" },
      receivedByUserId: "user-1",
      rawLeads: [
        {
          rowNumber: 1,
          raw: { name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com" },
        },
        {
          rowNumber: 2,
          raw: { name: "New Person", phone: "9000000001", email: "new@example.com" },
        },
      ],
    });

    expect(result.storedCount).toBe(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.batch.status).toBe("STORED");

    const staged = [...repository.staged.values()];
    const duplicate = staged.find((lead) => lead.phone === "9876543210");
    const fresh = staged.find((lead) => lead.phone === "9000000001");
    expect(duplicate?.duplicateStatus).toBe("EXACT");
    expect(fresh?.duplicateStatus).toBe("NONE");
    expect(fresh?.status).toBe("PENDING_REVIEW");
  });
});

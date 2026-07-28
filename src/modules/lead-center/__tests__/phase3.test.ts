import { describe, expect, it } from "vitest";
import { FakeLeadCenterRepository } from "./fakeLeadCenterRepository";
import { makeIngestLeads } from "../application/use-cases/ingestLeads";
import {
  makeImportStagedLeadsToCampaign,
  makePreviewCampaignImport,
} from "../application/use-cases/importStagedLeadsToCampaign";
import type { ExistingLeadLookupPort } from "../application/ports/ExistingLeadLookupPort";
import type { ClassifyDuplicatesPort } from "../application/ports/ClassifyDuplicatesPort";
import type {
  CampaignLookupPort,
  CreateCampaignLeadPort,
  LeadSourceResolvePort,
  ResolveCustomerPort,
} from "../application/ports/CampaignImportPorts";
import { classifyImportDuplicates } from "@/modules/leads/application/use-cases/detectImportDuplicates";
import type { LeadCenterSourceCode } from "../catalog";

const classifyDuplicates: ClassifyDuplicatesPort = {
  classify: (input) => classifyImportDuplicates(input),
};

const emptyLookup: ExistingLeadLookupPort = {
  async listForDuplicateScan() {
    return [];
  },
};

async function seedLeads(
  repository: FakeLeadCenterRepository,
  sourceCode: LeadCenterSourceCode,
  rows: Array<{ name: string; phone: string; email: string }>,
) {
  const ingest = makeIngestLeads(repository, emptyLookup, classifyDuplicates);
  return ingest({
    organizationId: "org-1",
    sourceCode,
    actor: { type: "USER", id: "user-1" },
    receivedByUserId: "user-1",
    rawLeads: rows.map((row, index) => ({
      rowNumber: index + 1,
      raw: { name: row.name, phone: row.phone, email: row.email },
    })),
  });
}

describe("campaign import by source", () => {
  it("previews skip for exact duplicates and imports eligible leads", async () => {
    const repository = new FakeLeadCenterRepository();
    const seeded = await seedLeads(repository, "FACEBOOK_LEAD_ADS", [
      { name: "Alpha User", phone: "9111111111", email: "a@ex.com" },
      { name: "Beta User", phone: "9222222222", email: "b@ex.com" },
    ]);
    const [a, b] = seeded.stagedLeads;
    await repository.updateStagedLeads("org-1", [a!.id], { duplicateStatus: "EXACT" });

    const preview = makePreviewCampaignImport(repository);
    const rows = await preview({
      organizationId: "org-1",
      stagedLeadIds: [a!.id, b!.id],
    });
    expect(rows.find((row) => row.stagedLeadId === a!.id)?.action).toBe("skip");
    expect(rows.find((row) => row.stagedLeadId === b!.id)?.action).toBe("import");

    const customers: ResolveCustomerPort = {
      async resolveOrCreate(input) {
        return {
          id: `cust-${input.fullName}`,
          organizationId: input.organizationId,
          fullName: input.fullName,
        };
      },
    };
    const createLead: CreateCampaignLeadPort = {
      async create(input) {
        return { id: `lead-${input.customerId}` };
      },
    };
    const leadSources: LeadSourceResolvePort = {
      async resolveSourceId() {
        return "source-1";
      },
    };
    const campaigns: CampaignLookupPort = {
      async getCampaign(id) {
        return {
          id,
          organizationId: "org-1",
          name: "Test Campaign",
          status: "ACTIVE",
          ownerManagerId: "mgr-1",
        };
      },
      async createCampaign() {
        throw new Error("should not create");
      },
      async assignLeads() {},
    };

    const importFn = makeImportStagedLeadsToCampaign(
      repository,
      customers,
      createLead,
      leadSources,
      campaigns,
    );
    const result = await importFn({
      organizationId: "org-1",
      stagedLeadIds: [a!.id, b!.id],
      actor: { type: "USER", id: "user-1" },
      campaignId: "camp-1",
      ownerManagerId: "mgr-1",
      allocationMethod: "NONE",
    });

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.createdLeadIds).toHaveLength(1);
    expect(repository.staged.get(b!.id)?.importStatus).toBe("IMPORTED");
    expect(repository.staged.get(a!.id)?.importStatus).not.toBe("IMPORTED");
  });

  it("imports by Facebook / Google / WhatsApp / ALL source scope", async () => {
    const repository = new FakeLeadCenterRepository();
    await seedLeads(repository, "FACEBOOK_LEAD_ADS", [
      { name: "FB User", phone: "9111111111", email: "fb@ex.com" },
    ]);
    await seedLeads(repository, "GOOGLE_ADS", [
      { name: "Google User", phone: "9222222222", email: "g@ex.com" },
    ]);
    await seedLeads(repository, "WHATSAPP_BUSINESS", [
      { name: "WA User", phone: "9333333333", email: "wa@ex.com" },
    ]);

    const preview = makePreviewCampaignImport(repository);
    const facebookOnly = await preview({
      organizationId: "org-1",
      sourceScope: "FACEBOOK_LEAD_ADS",
    });
    expect(facebookOnly).toHaveLength(1);
    expect(facebookOnly[0]?.fullName).toBe("FB User");

    const all = await preview({
      organizationId: "org-1",
      sourceScope: "ALL",
    });
    expect(all).toHaveLength(3);

    let createdName = "";
    const importFn = makeImportStagedLeadsToCampaign(
      repository,
      {
        async resolveOrCreate(input) {
          return { id: `c-${input.phone}`, organizationId: "org-1", fullName: input.fullName };
        },
      },
      {
        async create() {
          return { id: `L-${Math.random()}` };
        },
      },
      {
        async resolveSourceId() {
          return "source-1";
        },
      },
      {
        async getCampaign() {
          return null;
        },
        async createCampaign(input) {
          createdName = input.name;
          return { id: "new-camp", name: input.name };
        },
        async assignLeads() {},
      },
    );

    const result = await importFn({
      organizationId: "org-1",
      sourceScope: "GOOGLE_ADS",
      actor: { type: "USER", id: "user-1" },
      newCampaign: { name: "Google Import" },
      ownerManagerId: "mgr-1",
      allocationMethod: "NONE",
    });

    expect(createdName).toBe("Google Import");
    expect(result.importedCount).toBe(1);
    expect([...repository.staged.values()].find((l) => l.sourceCode === "GOOGLE_ADS")?.importStatus).toBe(
      "IMPORTED",
    );
    expect(
      [...repository.staged.values()].find((l) => l.sourceCode === "FACEBOOK_LEAD_ADS")?.importStatus,
    ).toBe("NOT_IMPORTED");
  });
});

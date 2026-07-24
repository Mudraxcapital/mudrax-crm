import { describe, expect, it } from "vitest";
import { FakeLeadRepository } from "./fakeLeadRepository";
import {
  FakeLeadCatalogRepository,
  ORG_ID,
  SOURCE_WEBSITE,
  STAGE_NEW,
} from "./fakeLeadCatalogRepository";
import { makeMergeLeads } from "../application/use-cases/mergeLeads";
import { LeadMergeError } from "../domain/errors/LeadErrors";

const actor = { actorType: "USER" as const, actorId: "actor-1" };

describe("mergeLeads", () => {
  it("closes the merged-away lead as lost duplicate", async () => {
    const repo = new FakeLeadRepository();
    const catalogs = new FakeLeadCatalogRepository();

    const survivor = await repo.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-1",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "Survivor",
      },
      actor,
    );
    const duplicate = await repo.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-1",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "Duplicate",
      },
      actor,
    );

    const mergeLeads = makeMergeLeads(repo, catalogs);
    const result = await mergeLeads({
      organizationId: ORG_ID,
      input: {
        survivingLeadId: survivor.id,
        mergedAwayLeadId: duplicate.id,
      },
      actor,
    });

    expect(result.surviving.id).toBe(survivor.id);
    expect(result.mergedAway.currentStageBucket).toBe("CLOSED");
  });

  it("rejects leads from different customers", async () => {
    const repo = new FakeLeadRepository();
    const catalogs = new FakeLeadCatalogRepository();

    const a = await repo.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-1",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "A",
      },
      actor,
    );
    const b = await repo.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-2",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "B",
      },
      actor,
    );

    const mergeLeads = makeMergeLeads(repo, catalogs);
    await expect(
      mergeLeads({
        organizationId: ORG_ID,
        input: { survivingLeadId: a.id, mergedAwayLeadId: b.id },
        actor,
      }),
    ).rejects.toBeInstanceOf(LeadMergeError);
  });
});

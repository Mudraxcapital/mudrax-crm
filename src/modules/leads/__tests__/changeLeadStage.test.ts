import { beforeEach, describe, expect, it } from "vitest";
import { makeChangeLeadStage } from "../application/use-cases/changeLeadStage";
import { LeadAlreadyClosedError, LostReasonRequiredError } from "../domain/errors/LeadErrors";
import { FakeLeadRepository } from "./fakeLeadRepository";
import {
  FakeLeadCatalogRepository,
  LOST_REASON_PRICE,
  ORG_ID,
  SOURCE_WEBSITE,
  STAGE_CONTACTED,
  STAGE_LOST,
  STAGE_NEW,
  STAGE_WON,
} from "./fakeLeadCatalogRepository";

describe("changeLeadStage", () => {
  let repository: FakeLeadRepository;
  let catalogRepository: FakeLeadCatalogRepository;
  let changeLeadStage: ReturnType<typeof makeChangeLeadStage>;
  let leadId: string;

  beforeEach(async () => {
    repository = new FakeLeadRepository();
    catalogRepository = new FakeLeadCatalogRepository();
    changeLeadStage = makeChangeLeadStage(repository, catalogRepository);

    const lead = await repository.createWithAudit(
      {
        organizationId: ORG_ID,
        customerId: "customer-1",
        leadSourceId: SOURCE_WEBSITE.id,
        currentStageId: STAGE_NEW.id,
        fullNameSnapshot: "Rahul Sharma",
      },
      { actorType: "USER", actorId: "actor-1" },
    );
    leadId = lead.id;
  });

  it("moves a Lead from New to Contacted", async () => {
    const dto = await changeLeadStage({
      id: leadId,
      input: { stageId: STAGE_CONTACTED.id },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.currentStageId).toBe(STAGE_CONTACTED.id);
    expect(dto.wonAt).toBeNull();
    expect(dto.lostAt).toBeNull();
  });

  it("sets wonAt when moved into a Closed-Won Stage", async () => {
    const dto = await changeLeadStage({
      id: leadId,
      input: { stageId: STAGE_WON.id },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.wonAt).not.toBeNull();
    expect(dto.currentStageBucket).toBe("CLOSED");
  });

  it("requires a Lost Reason when moved into a Closed-Lost Stage", async () => {
    await expect(
      changeLeadStage({
        id: leadId,
        input: { stageId: STAGE_LOST.id },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(LostReasonRequiredError);
  });

  it("sets lostAt and the Lost Reason when moved into Closed-Lost with a reason", async () => {
    const dto = await changeLeadStage({
      id: leadId,
      input: { stageId: STAGE_LOST.id, lostReasonId: LOST_REASON_PRICE.id },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.lostAt).not.toBeNull();
    expect(dto.lostReasonId).toBe(LOST_REASON_PRICE.id);
  });

  it("rejects moving an already-Closed Lead to another Stage", async () => {
    await changeLeadStage({
      id: leadId,
      input: { stageId: STAGE_WON.id },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      changeLeadStage({
        id: leadId,
        input: { stageId: STAGE_CONTACTED.id },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(LeadAlreadyClosedError);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { makeChangeLeadStage } from "../application/use-cases/changeLeadStage";
import {
  DndNoteRequiredError,
  LeadAlreadyClosedError,
  LostNoteRequiredError,
  LostReasonRequiredError,
} from "../domain/errors/LeadErrors";
import { FakeLeadRepository } from "./fakeLeadRepository";
import { FakeLeadNoteRepository } from "./fakeLeadNoteRepository";
import {
  FakeLeadCatalogRepository,
  LOST_REASON_PRICE,
  ORG_ID,
  SOURCE_WEBSITE,
  STAGE_CONTACTED,
  STAGE_DND,
  STAGE_LOST,
  STAGE_NEW,
  STAGE_WON,
} from "./fakeLeadCatalogRepository";

describe("changeLeadStage", () => {
  let repository: FakeLeadRepository;
  let catalogRepository: FakeLeadCatalogRepository;
  let noteRepository: FakeLeadNoteRepository;
  let changeLeadStage: ReturnType<typeof makeChangeLeadStage>;
  let leadId: string;

  beforeEach(async () => {
    repository = new FakeLeadRepository();
    catalogRepository = new FakeLeadCatalogRepository();
    noteRepository = new FakeLeadNoteRepository();
    changeLeadStage = makeChangeLeadStage(
      repository,
      catalogRepository,
      noteRepository,
      async () => "dnd-campaign-1",
    );

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
        input: { stageId: STAGE_LOST.id, note: "Budget too high" },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(LostReasonRequiredError);
  });

  it("requires a note when moved into a Closed-Lost Stage", async () => {
    await expect(
      changeLeadStage({
        id: leadId,
        input: { stageId: STAGE_LOST.id, lostReasonId: LOST_REASON_PRICE.id },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(LostNoteRequiredError);
  });

  it("sets lostAt, Lost Reason, and saves the note when Closed-Lost", async () => {
    const dto = await changeLeadStage({
      id: leadId,
      input: {
        stageId: STAGE_LOST.id,
        lostReasonId: LOST_REASON_PRICE.id,
        note: "Customer chose a competitor.",
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.lostAt).not.toBeNull();
    expect(dto.lostReasonId).toBe(LOST_REASON_PRICE.id);
    const notes = await noteRepository.listByLead(leadId);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.body).toBe("Customer chose a competitor.");
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

  it("requires a note when moved into Do Not Disturb", async () => {
    await expect(
      changeLeadStage({
        id: leadId,
        input: { stageId: STAGE_DND.id },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(DndNoteRequiredError);
  });

  it("saves the note and moves the lead into the DND campaign", async () => {
    const dto = await changeLeadStage({
      id: leadId,
      input: { stageId: STAGE_DND.id, note: "Customer asked not to be called." },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.currentStageId).toBe(STAGE_DND.id);
    expect(dto.campaignId).toBe("dnd-campaign-1");
    const notes = await noteRepository.listByLead(leadId);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.body).toBe("Customer asked not to be called.");
  });
});

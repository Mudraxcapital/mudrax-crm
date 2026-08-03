import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCampaign } from "../application/use-cases/createCampaign";
import { makeChangeCampaignStatus } from "../application/use-cases/changeCampaignStatus";
import {
  CampaignNotFoundError,
  InvalidCampaignStatusTransitionError,
} from "../domain/errors/CampaignErrors";
import { FakeCampaignRepository } from "./fakeCampaignRepository";

const ORG_ID = "org-1";

describe("changeCampaignStatus", () => {
  let repository: FakeCampaignRepository;
  let createCampaign: ReturnType<typeof makeCreateCampaign>;
  let changeCampaignStatus: ReturnType<typeof makeChangeCampaignStatus>;

  beforeEach(() => {
    repository = new FakeCampaignRepository();
    createCampaign = makeCreateCampaign(repository);
    changeCampaignStatus = makeChangeCampaignStatus(repository);
  });

  it("creates campaigns as ACTIVE and allows ACTIVE -> PAUSED", async () => {
    const campaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Spring Push" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });
    expect(campaign.status).toBe("ACTIVE");

    const updated = await changeCampaignStatus({
      id: campaign.id,
      input: { status: "PAUSED" },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(updated.status).toBe("PAUSED");
  });

  it("rejects an invalid transition (ACTIVE -> DRAFT)", async () => {
    const campaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Spring Push" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });

    await expect(
      changeCampaignStatus({
        id: campaign.id,
        input: { status: "DRAFT" },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidCampaignStatusTransitionError);
  });

  it("rejects a transition on a non-existent Campaign", async () => {
    await expect(
      changeCampaignStatus({
        id: "does-not-exist",
        input: { status: "ACTIVE" },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(CampaignNotFoundError);
  });

  it("allows ARCHIVED -> ACTIVE (restore)", async () => {
    const campaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Spring Push" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });
    await changeCampaignStatus({
      id: campaign.id,
      input: { status: "ARCHIVED" },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const restored = await changeCampaignStatus({
      id: campaign.id,
      input: { status: "ACTIVE" },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(restored.status).toBe("ACTIVE");
  });

  it("rejects ARCHIVED -> COMPLETED (only ACTIVE restore is allowed)", async () => {
    const campaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Spring Push" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });
    await changeCampaignStatus({
      id: campaign.id,
      input: { status: "ARCHIVED" },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    await expect(
      changeCampaignStatus({
        id: campaign.id,
        input: { status: "COMPLETED" },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidCampaignStatusTransitionError);
  });
});

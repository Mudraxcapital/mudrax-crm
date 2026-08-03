import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCampaign } from "../application/use-cases/createCampaign";
import { FakeCampaignRepository } from "./fakeCampaignRepository";

const ORG_ID = "org-1";

describe("createCampaign", () => {
  let repository: FakeCampaignRepository;
  let createCampaign: ReturnType<typeof makeCreateCampaign>;

  beforeEach(() => {
    repository = new FakeCampaignRepository();
    createCampaign = makeCreateCampaign(repository);
  });

  it("creates a Campaign in ACTIVE status", async () => {
    const dto = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Spring Push" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });

    expect(dto.status).toBe("ACTIVE");
    expect(dto.name).toBe("Spring Push");
    expect(dto.ownerManagerId).toBe("actor-1");
  });

  it("records a CampaignCreated Audit Record", async () => {
    const dto = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Spring Push" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("CampaignCreated");
  });
});

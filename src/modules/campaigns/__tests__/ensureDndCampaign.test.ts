import { beforeEach, describe, expect, it } from "vitest";
import {
  DND_CAMPAIGN_NAME,
  makeEnsureDndCampaign,
} from "../application/use-cases/ensureDndCampaign";
import { FakeCampaignRepository } from "./fakeCampaignRepository";
import { FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const MANAGER_ID = "manager-1";
const CALLER_ID = "caller-1";

describe("ensureDndCampaign", () => {
  let repository: FakeCampaignRepository;
  let userLookup: FakeUserLookupPort;
  let ensureDndCampaign: ReturnType<typeof makeEnsureDndCampaign>;

  beforeEach(() => {
    repository = new FakeCampaignRepository();
    userLookup = new FakeUserLookupPort();
    userLookup.users.set(CALLER_ID, {
      id: CALLER_ID,
      organizationId: ORG_ID,
      fullName: "Caller One",
      status: "ACTIVE",
    });
    ensureDndCampaign = makeEnsureDndCampaign(repository, userLookup);
  });

  it("creates an ACTIVE Do Not Disturb campaign and enrolls members", async () => {
    const dto = await ensureDndCampaign({
      organizationId: ORG_ID,
      ownerManagerId: MANAGER_ID,
      actor: { actorType: "USER", actorId: MANAGER_ID },
      memberUserIds: [CALLER_ID],
    });

    expect(dto.name).toBe(DND_CAMPAIGN_NAME);
    expect(dto.status).toBe("ACTIVE");
    expect(dto.ownerManagerId).toBe(MANAGER_ID);

    const membership = await repository.findMembership(dto.id, CALLER_ID);
    expect(membership?.isActive).toBe(true);
  });

  it("reuses an existing Do Not Disturb campaign instead of duplicating", async () => {
    const first = await ensureDndCampaign({
      organizationId: ORG_ID,
      ownerManagerId: MANAGER_ID,
      actor: { actorType: "USER", actorId: MANAGER_ID },
    });
    const second = await ensureDndCampaign({
      organizationId: ORG_ID,
      ownerManagerId: MANAGER_ID,
      actor: { actorType: "USER", actorId: MANAGER_ID },
      memberUserIds: [CALLER_ID],
    });

    expect(second.id).toBe(first.id);
    expect(repository.campaigns.size).toBe(1);
  });
});

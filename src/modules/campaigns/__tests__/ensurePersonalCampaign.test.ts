import { beforeEach, describe, expect, it } from "vitest";
import {
  makeEnsurePersonalCampaign,
  PERSONAL_CAMPAIGN_NAME,
} from "../application/use-cases/ensurePersonalCampaign";
import { FakeCampaignRepository } from "./fakeCampaignRepository";
import { FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const MANAGER_ID = "manager-1";
const CALLER_ID = "caller-1";

describe("ensurePersonalCampaign", () => {
  let repository: FakeCampaignRepository;
  let userLookup: FakeUserLookupPort;
  let ensurePersonalCampaign: ReturnType<typeof makeEnsurePersonalCampaign>;

  beforeEach(() => {
    repository = new FakeCampaignRepository();
    userLookup = new FakeUserLookupPort();
    userLookup.users.set(CALLER_ID, {
      id: CALLER_ID,
      organizationId: ORG_ID,
      fullName: "Caller One",
      status: "ACTIVE",
    });
    ensurePersonalCampaign = makeEnsurePersonalCampaign(repository, userLookup);
  });

  it("creates an ACTIVE Personal Campaign and enrolls members", async () => {
    const dto = await ensurePersonalCampaign({
      organizationId: ORG_ID,
      ownerManagerId: MANAGER_ID,
      actor: { actorType: "USER", actorId: MANAGER_ID },
      memberUserIds: [CALLER_ID],
    });

    expect(dto.name).toBe(PERSONAL_CAMPAIGN_NAME);
    expect(dto.status).toBe("ACTIVE");
    expect(dto.ownerManagerId).toBe(MANAGER_ID);

    const membership = await repository.findMembership(dto.id, CALLER_ID);
    expect(membership?.isActive).toBe(true);
  });

  it("reuses an existing Personal Campaign instead of duplicating", async () => {
    const first = await ensurePersonalCampaign({
      organizationId: ORG_ID,
      ownerManagerId: MANAGER_ID,
      actor: { actorType: "USER", actorId: MANAGER_ID },
    });
    const second = await ensurePersonalCampaign({
      organizationId: ORG_ID,
      ownerManagerId: MANAGER_ID,
      actor: { actorType: "USER", actorId: MANAGER_ID },
      memberUserIds: [CALLER_ID],
    });

    expect(second.id).toBe(first.id);
    expect(repository.campaigns.size).toBe(1);
  });
});

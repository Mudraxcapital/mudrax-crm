import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCampaign } from "../application/use-cases/createCampaign";
import { makeAddCampaignMember } from "../application/use-cases/manageCampaignMembership";
import { makeAssignCampaignLeads } from "../application/use-cases/assignCampaignLeads";
import { FakeCampaignRepository } from "./fakeCampaignRepository";
import { FakeLeadAssignmentPort, FakeUserLookupPort, fakeLeadSummary } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000a2";
const USER_C = "00000000-0000-0000-0000-0000000000a3";

function leadId(n: number): string {
  return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

describe("redistribute on addCampaignMember", () => {
  let repository: FakeCampaignRepository;
  let userLookup: FakeUserLookupPort;
  let leadLookup: FakeLeadAssignmentPort;
  let createCampaign: ReturnType<typeof makeCreateCampaign>;
  let addCampaignMember: ReturnType<typeof makeAddCampaignMember>;
  let assignCampaignLeads: ReturnType<typeof makeAssignCampaignLeads>;
  let campaignId: string;

  beforeEach(async () => {
    repository = new FakeCampaignRepository();
    userLookup = new FakeUserLookupPort();
    leadLookup = new FakeLeadAssignmentPort();
    createCampaign = makeCreateCampaign(repository);
    addCampaignMember = makeAddCampaignMember(repository, userLookup, leadLookup);
    assignCampaignLeads = makeAssignCampaignLeads(repository, leadLookup);

    for (const [id, name] of [
      [USER_A, "A"],
      [USER_B, "B"],
      [USER_C, "C"],
    ] as const) {
      userLookup.users.set(id, {
        id,
        organizationId: ORG_ID,
        fullName: name,
        status: "ACTIVE",
      });
    }

    const campaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Push", description: "Distribution: EQUAL" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });
    campaignId = campaign.id;

    await addCampaignMember({
      campaignId,
      input: { userId: USER_A },
      actor: { actorType: "USER", actorId: "actor-1" },
      redistribute: false,
    });
    await addCampaignMember({
      campaignId,
      input: { userId: USER_B },
      actor: { actorType: "USER", actorId: "actor-1" },
      redistribute: false,
    });

    for (let i = 1; i <= 6; i += 1) {
      leadLookup.leads.set(
        leadId(i),
        fakeLeadSummary({
          id: leadId(i),
          organizationId: ORG_ID,
          currentStageBucket: "ACTIVE",
        }),
      );
    }

    await assignCampaignLeads({
      campaignId,
      input: {
        leadIds: [leadId(1), leadId(2), leadId(3), leadId(4), leadId(5), leadId(6)],
        allocationMethod: "EQUAL",
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    leadLookup.assignCalls = [];
  });

  it("redistributes uncompleted leads to include the new caller", async () => {
    await addCampaignMember({
      campaignId,
      input: { userId: USER_C },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(leadLookup.assignCalls).toHaveLength(6);
    const countsByUser = new Map<string, number>();
    for (const call of leadLookup.assignCalls) {
      countsByUser.set(call.assignedToUserId, (countsByUser.get(call.assignedToUserId) ?? 0) + 1);
    }
    expect(countsByUser.get(USER_A)).toBe(2);
    expect(countsByUser.get(USER_B)).toBe(2);
    expect(countsByUser.get(USER_C)).toBe(2);
  });

  it("skips closed leads during redistribution", async () => {
    leadLookup.leads.set(
      leadId(1),
      fakeLeadSummary({
        id: leadId(1),
        organizationId: ORG_ID,
        currentStageBucket: "CLOSED",
        wonAt: new Date().toISOString(),
      }),
    );

    await addCampaignMember({
      campaignId,
      input: { userId: USER_C },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(leadLookup.assignCalls).toHaveLength(5);
    expect(leadLookup.assignCalls.every((call) => call.leadId !== leadId(1))).toBe(true);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCampaign } from "../application/use-cases/createCampaign";
import { makeAddCampaignMember } from "../application/use-cases/manageCampaignMembership";
import { makeAssignCampaignLeads } from "../application/use-cases/assignCampaignLeads";
import {
  InvalidAllocationError,
  InvalidLeadReferenceError,
  NoActiveMembersError,
} from "../domain/errors/CampaignErrors";
import { FakeCampaignRepository } from "./fakeCampaignRepository";
import { FakeLeadAssignmentPort, FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000a2";

function leadId(n: number): string {
  return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

describe("assignCampaignLeads", () => {
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
    addCampaignMember = makeAddCampaignMember(repository, userLookup);
    assignCampaignLeads = makeAssignCampaignLeads(repository, leadLookup);

    userLookup.users.set(USER_A, {
      id: USER_A,
      organizationId: ORG_ID,
      fullName: "A",
      status: "ACTIVE",
    });
    userLookup.users.set(USER_B, {
      id: USER_B,
      organizationId: ORG_ID,
      fullName: "B",
      status: "ACTIVE",
    });

    const campaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Spring Push" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });
    campaignId = campaign.id;

    await addCampaignMember({
      campaignId,
      input: { userId: USER_A },
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    await addCampaignMember({
      campaignId,
      input: { userId: USER_B },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    for (let i = 1; i <= 4; i += 1) {
      leadLookup.leads.set(leadId(i), {
        id: leadId(i),
        organizationId: ORG_ID,
        currentStageBucket: "INITIAL",
        wonAt: null,
        lostAt: null,
      });
    }
  });

  it("distributes Leads equally by member weight and marks the batch COMPLETED", async () => {
    const dto = await assignCampaignLeads({
      campaignId,
      input: {
        leadIds: [leadId(1), leadId(2), leadId(3), leadId(4)],
        allocationMethod: "EQUAL",
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.status).toBe("COMPLETED");
    expect(dto.targetLeadCount).toBe(4);
    expect(leadLookup.assignCalls).toHaveLength(4);
    const countsByUser = new Map<string, number>();
    for (const call of leadLookup.assignCalls) {
      countsByUser.set(call.assignedToUserId, (countsByUser.get(call.assignedToUserId) ?? 0) + 1);
    }
    expect(countsByUser.get(USER_A)).toBe(2);
    expect(countsByUser.get(USER_B)).toBe(2);
  });

  it("distributes Leads in strict round-robin order", async () => {
    const dto = await assignCampaignLeads({
      campaignId,
      input: {
        leadIds: [leadId(1), leadId(2), leadId(3), leadId(4)],
        allocationMethod: "ROUND_ROBIN",
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.status).toBe("COMPLETED");
    expect(leadLookup.assignCalls.map((call) => call.assignedToUserId)).toEqual([
      USER_A,
      USER_B,
      USER_A,
      USER_B,
    ]);
  });

  it("assigns all selected Leads to one agent for MANUAL strategy", async () => {
    const dto = await assignCampaignLeads({
      campaignId,
      input: {
        leadIds: [leadId(1), leadId(2), leadId(3)],
        allocationMethod: "MANUAL",
        manualAssigneeUserId: USER_B,
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.status).toBe("COMPLETED");
    expect(leadLookup.assignCalls.every((call) => call.assignedToUserId === USER_B)).toBe(true);
  });

  it("distributes Leads by explicit percentage", async () => {
    const dto = await assignCampaignLeads({
      campaignId,
      input: {
        leadIds: [leadId(1), leadId(2), leadId(3), leadId(4)],
        allocationMethod: "PERCENTAGE",
        percentages: { [USER_A]: 75, [USER_B]: 25 },
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.status).toBe("COMPLETED");
    const allocationForA = dto.allocations.find((allocation) => allocation.userId === USER_A);
    const allocationForB = dto.allocations.find((allocation) => allocation.userId === USER_B);
    expect(allocationForA?.allocatedCount).toBe(3);
    expect(allocationForB?.allocatedCount).toBe(1);
  });

  it("rejects percentages that do not sum to 100", async () => {
    await expect(
      assignCampaignLeads({
        campaignId,
        input: {
          leadIds: [leadId(1)],
          allocationMethod: "PERCENTAGE",
          percentages: { [USER_A]: 50 },
        },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidAllocationError);
  });

  it("rejects a reference to a Lead outside the Organization", async () => {
    leadLookup.leads.set("00000000-0000-0000-0000-000000000099", {
      id: "00000000-0000-0000-0000-000000000099",
      organizationId: "other-org",
      currentStageBucket: "INITIAL",
      wonAt: null,
      lostAt: null,
    });

    await expect(
      assignCampaignLeads({
        campaignId,
        input: {
          leadIds: ["00000000-0000-0000-0000-000000000099"],
          allocationMethod: "EQUAL",
        },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidLeadReferenceError);
  });

  it("rejects assignment when the Campaign has no active members", async () => {
    const emptyCampaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "No Members" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });

    await expect(
      assignCampaignLeads({
        campaignId: emptyCampaign.id,
        input: { leadIds: [leadId(1)], allocationMethod: "EQUAL" },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(NoActiveMembersError);
  });

  it("marks the batch FAILED when every per-Lead assignment call fails", async () => {
    leadLookup.failFor.add(leadId(1));

    const dto = await assignCampaignLeads({
      campaignId,
      input: { leadIds: [leadId(1)], allocationMethod: "EQUAL" },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.status).toBe("FAILED");
  });
});

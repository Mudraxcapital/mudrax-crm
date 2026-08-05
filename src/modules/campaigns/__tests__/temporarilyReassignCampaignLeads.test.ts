import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateCampaign } from "../application/use-cases/createCampaign";
import { makeAddCampaignMember } from "../application/use-cases/manageCampaignMembership";
import {
  makeEndTemporaryCampaignReassignment,
  makeTemporarilyReassignCampaignLeads,
} from "../application/use-cases/temporarilyReassignCampaignLeads";
import { InvalidAllocationError } from "../domain/errors/CampaignErrors";
import { FakeCampaignRepository } from "./fakeCampaignRepository";
import { FakeLeadAssignmentPort, FakeUserLookupPort, fakeLeadSummary } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000a2";
const USER_C = "00000000-0000-0000-0000-0000000000a3";

function leadId(n: number): string {
  return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

describe("temporarilyReassignCampaignLeads", () => {
  let repository: FakeCampaignRepository;
  let userLookup: FakeUserLookupPort;
  let leadLookup: FakeLeadAssignmentPort;
  let createCampaign: ReturnType<typeof makeCreateCampaign>;
  let addCampaignMember: ReturnType<typeof makeAddCampaignMember>;
  let temporarilyReassign: ReturnType<typeof makeTemporarilyReassignCampaignLeads>;
  let endTemporary: ReturnType<typeof makeEndTemporaryCampaignReassignment>;
  let campaignId: string;

  beforeEach(async () => {
    repository = new FakeCampaignRepository();
    userLookup = new FakeUserLookupPort();
    leadLookup = new FakeLeadAssignmentPort();
    createCampaign = makeCreateCampaign(repository);
    addCampaignMember = makeAddCampaignMember(repository, userLookup);
    temporarilyReassign = makeTemporarilyReassignCampaignLeads(
      repository,
      leadLookup,
      userLookup,
    );
    endTemporary = makeEndTemporaryCampaignReassignment(repository, leadLookup);

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
    userLookup.users.set(USER_C, {
      id: USER_C,
      organizationId: ORG_ID,
      fullName: "C",
      status: "ACTIVE",
    });

    const campaign = await createCampaign({
      organizationId: ORG_ID,
      input: { name: "Holiday Cover" },
      actor: { actorType: "USER", actorId: "actor-1" },
      ownerManagerId: "actor-1",
    });
    campaignId = campaign.id;

    await addCampaignMember({
      campaignId,
      input: { userId: USER_A },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    for (let i = 1; i <= 3; i += 1) {
      leadLookup.leads.set(
        leadId(i),
        fakeLeadSummary({
          id: leadId(i),
          organizationId: ORG_ID,
          currentAssigneeUserId: USER_A,
          currentStageBucket: "ACTIVE",
        }),
      );
    }
  });

  it("moves caller leads to a temporary cover who is already a member", async () => {
    await addCampaignMember({
      campaignId,
      input: { userId: USER_B },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const result = await temporarilyReassign({
      campaignId,
      input: { fromUserId: USER_A, toUserId: USER_B, durationDays: 5 },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(result.movedCount).toBe(3);
    expect(leadLookup.tempAssignCalls).toHaveLength(3);
    expect(leadLookup.leads.get(leadId(1))?.isTemporaryAssignee).toBe(true);
    expect(leadLookup.leads.get(leadId(1))?.currentAssigneeUserId).toBe(USER_B);
    expect(leadLookup.leads.get(leadId(1))?.permanentAssigneeUserId).toBe(USER_A);
  });

  it("allows any org agent as temp caller and enrolls them on the campaign", async () => {
    const result = await temporarilyReassign({
      campaignId,
      input: { fromUserId: USER_A, toUserId: USER_C, durationDays: 3 },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(result.movedCount).toBe(3);
    const membership = await repository.findMembership(campaignId, USER_C);
    expect(membership?.isActive).toBe(true);
    expect(leadLookup.leads.get(leadId(1))?.currentAssigneeUserId).toBe(USER_C);
  });

  it("ends temporary cover early", async () => {
    await temporarilyReassign({
      campaignId,
      input: { fromUserId: USER_A, toUserId: USER_C, durationDays: 5 },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const ended = await endTemporary({
      campaignId,
      fromUserId: USER_A,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(ended.revertedCount).toBe(3);
    expect(leadLookup.leads.get(leadId(1))?.currentAssigneeUserId).toBe(USER_A);
    expect(leadLookup.leads.get(leadId(1))?.isTemporaryAssignee).toBe(false);
  });

  it("rejects when the caller has no open leads", async () => {
    for (const id of [leadId(1), leadId(2), leadId(3)]) {
      leadLookup.leads.set(
        id,
        fakeLeadSummary({
          id,
          organizationId: ORG_ID,
          currentAssigneeUserId: USER_B,
          currentStageBucket: "ACTIVE",
        }),
      );
    }

    await expect(
      temporarilyReassign({
        campaignId,
        input: { fromUserId: USER_A, toUserId: USER_C, durationDays: 2 },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidAllocationError);
  });
});

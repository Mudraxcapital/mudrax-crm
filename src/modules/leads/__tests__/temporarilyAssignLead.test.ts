import { beforeEach, describe, expect, it } from "vitest";
import { makeAssignLead } from "../application/use-cases/assignLead";
import { makeTemporarilyAssignLead } from "../application/use-cases/temporarilyAssignLead";
import {
  makeRevertExpiredTemporaryAssignments,
  makeRevertTemporaryLeadAssignment,
} from "../application/use-cases/revertTemporaryLeadAssignments";
import { InvalidTemporaryAssignmentError } from "../domain/errors/LeadErrors";
import { FakeLeadRepository } from "./fakeLeadRepository";
import {
  FakeLeadCatalogRepository,
  ORG_ID,
  SOURCE_WEBSITE,
  STAGE_NEW,
} from "./fakeLeadCatalogRepository";
import { FakeUserLookupPort } from "./fakeLookupPorts";

const USER_A = "user-a";
const USER_B = "user-b";

describe("temporarilyAssignLead", () => {
  let repository: FakeLeadRepository;
  let catalogRepository: FakeLeadCatalogRepository;
  let userLookup: FakeUserLookupPort;
  let assignLead: ReturnType<typeof makeAssignLead>;
  let temporarilyAssignLead: ReturnType<typeof makeTemporarilyAssignLead>;
  let revertTemporaryLeadAssignment: ReturnType<typeof makeRevertTemporaryLeadAssignment>;
  let revertExpiredTemporaryAssignments: ReturnType<
    typeof makeRevertExpiredTemporaryAssignments
  >;
  let leadId: string;

  beforeEach(async () => {
    repository = new FakeLeadRepository();
    catalogRepository = new FakeLeadCatalogRepository();
    userLookup = new FakeUserLookupPort();
    userLookup.users.set(USER_A, {
      id: USER_A,
      organizationId: ORG_ID,
      status: "ACTIVE",
      roleName: "Caller",
    });
    userLookup.users.set(USER_B, {
      id: USER_B,
      organizationId: ORG_ID,
      status: "ACTIVE",
      roleName: "Caller",
    });
    assignLead = makeAssignLead(repository, catalogRepository, userLookup);
    temporarilyAssignLead = makeTemporarilyAssignLead(
      repository,
      catalogRepository,
      userLookup,
    );
    revertTemporaryLeadAssignment = makeRevertTemporaryLeadAssignment(repository, userLookup);
    revertExpiredTemporaryAssignments = makeRevertExpiredTemporaryAssignments(
      repository,
      userLookup,
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

    await assignLead({
      id: leadId,
      input: { assignedToUserId: USER_A },
      actor: { actorType: "USER", actorId: "actor-1" },
    });
  });

  it("marks a lead as temporary and reverts after expiry", async () => {
    const temp = await temporarilyAssignLead({
      id: leadId,
      assignedToUserId: USER_B,
      durationDays: 3,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(temp.currentAssigneeUserId).toBe(USER_B);
    expect(temp.permanentAssigneeUserId).toBe(USER_A);
    expect(temp.isTemporaryAssignee).toBe(true);

    const history = await repository.listAssignmentHistory(leadId);
    expect(history.some((row) => row.assignmentType === "TEMPORARY_REASSIGNMENT")).toBe(true);

    const lead = await repository.findById(leadId);
    if (lead) {
      lead.temporaryAssigneeUntil = new Date(Date.now() - 60_000);
      repository.leads.set(leadId, lead);
    }

    const expired = await revertExpiredTemporaryAssignments({ organizationId: ORG_ID });
    expect(expired.revertedCount).toBe(1);

    const reverted = await repository.findById(leadId);
    expect(reverted?.currentAssigneeUserId).toBe(USER_A);
    expect(reverted?.permanentAssigneeUserId).toBeNull();
    expect(reverted?.temporaryAssigneeUntil).toBeNull();
  });

  it("rejects temp assign to the same permanent caller", async () => {
    await expect(
      temporarilyAssignLead({
        id: leadId,
        assignedToUserId: USER_A,
        durationDays: 2,
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidTemporaryAssignmentError);
  });

  it("ends temporary cover early", async () => {
    await temporarilyAssignLead({
      id: leadId,
      assignedToUserId: USER_B,
      durationDays: 5,
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const result = await revertTemporaryLeadAssignment({
      id: leadId,
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    expect(result.reverted).toBe(true);

    const lead = await repository.findById(leadId);
    expect(lead?.currentAssigneeUserId).toBe(USER_A);
    expect(lead?.temporaryAssigneeUntil).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateFollowUp } from "../application/use-cases/createFollowUp";
import { makeReassignFollowUp } from "../application/use-cases/reassignFollowUp";
import { InvalidAssigneeReferenceError } from "../domain/errors/FollowUpErrors";
import { FakeFollowUpRepository } from "./fakeFollowUpRepository";
import { FakeLeadLookupPort, FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const LEAD_ID = "lead-1";
const USER_A = "user-a";
const USER_B = "user-b";

describe("reassignFollowUp", () => {
  let repository: FakeFollowUpRepository;
  let leadLookup: FakeLeadLookupPort;
  let userLookup: FakeUserLookupPort;
  let createFollowUp: ReturnType<typeof makeCreateFollowUp>;
  let reassignFollowUp: ReturnType<typeof makeReassignFollowUp>;
  let followUpId: string;

  beforeEach(async () => {
    repository = new FakeFollowUpRepository();
    leadLookup = new FakeLeadLookupPort();
    userLookup = new FakeUserLookupPort();
    leadLookup.leads.set(LEAD_ID, {
      id: LEAD_ID,
      organizationId: ORG_ID,
      currentAssigneeUserId: USER_A,
    });
    userLookup.users.set(USER_A, { id: USER_A, organizationId: ORG_ID, status: "ACTIVE" });
    userLookup.users.set(USER_B, { id: USER_B, organizationId: ORG_ID, status: "ACTIVE" });
    createFollowUp = makeCreateFollowUp(repository, leadLookup, leadLookup, userLookup);
    reassignFollowUp = makeReassignFollowUp(repository, userLookup);

    const created = await createFollowUp({
      organizationId: ORG_ID,
      input: { leadId: LEAD_ID, triggerType: "FOLLOW_UP", scheduledFor: new Date("2030-01-01") },
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    followUpId = created.id;
  });

  it("reassigns the Follow-up and records reassignment history", async () => {
    const dto = await reassignFollowUp({
      id: followUpId,
      input: { toUserId: USER_B, reason: "Original Caller on leave" },
      actor: { actorType: "USER", actorId: "team-leader-1" },
    });

    expect(dto.currentAssigneeUserId).toBe(USER_B);
    const history = await repository.listReassignmentHistory(followUpId);
    expect(history).toHaveLength(1);
    expect(history[0]?.fromUserId).toBe(USER_A);
    expect(history[0]?.toUserId).toBe(USER_B);
    expect(history[0]?.reason).toBe("Original Caller on leave");
  });

  it("records a FollowUpReassigned Audit Record", async () => {
    await reassignFollowUp({
      id: followUpId,
      input: { toUserId: USER_B, reason: null },
      actor: { actorType: "USER", actorId: "team-leader-1" },
    });

    const auditEntries = await repository.listAuditLog(followUpId);
    expect(auditEntries.some((entry) => entry.action === "FollowUpReassigned")).toBe(true);
  });

  it("rejects reassignment to a non-existent or inactive User", async () => {
    await expect(
      reassignFollowUp({
        id: followUpId,
        input: { toUserId: "does-not-exist", reason: null },
        actor: { actorType: "USER", actorId: "team-leader-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidAssigneeReferenceError);
  });
});

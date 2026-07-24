import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateFollowUp } from "../application/use-cases/createFollowUp";
import {
  InvalidAssigneeReferenceError,
  InvalidLeadReferenceError,
} from "../domain/errors/FollowUpErrors";
import { FakeFollowUpRepository } from "./fakeFollowUpRepository";
import { FakeLeadLookupPort, FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const LEAD_ID = "lead-1";
const USER_A = "user-a";
const USER_B = "user-b";

describe("createFollowUp", () => {
  let repository: FakeFollowUpRepository;
  let leadLookup: FakeLeadLookupPort;
  let userLookup: FakeUserLookupPort;
  let createFollowUp: ReturnType<typeof makeCreateFollowUp>;

  beforeEach(() => {
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
  });

  it("defaults the assignee to the Lead's current assignee", async () => {
    const dto = await createFollowUp({
      organizationId: ORG_ID,
      input: { leadId: LEAD_ID, triggerType: "FOLLOW_UP", scheduledFor: new Date("2030-01-01") },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.currentAssigneeUserId).toBe(USER_A);
    expect(dto.status).toBe("SCHEDULED");
  });

  it("uses an explicit assignee when supplied", async () => {
    const dto = await createFollowUp({
      organizationId: ORG_ID,
      input: {
        leadId: LEAD_ID,
        triggerType: "CALL_LATER",
        scheduledFor: new Date("2030-01-01"),
        currentAssigneeUserId: USER_B,
      },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(dto.currentAssigneeUserId).toBe(USER_B);
    expect(dto.triggerType).toBe("CALL_LATER");
  });

  it("records a FollowUpCreated Audit Record", async () => {
    const dto = await createFollowUp({
      organizationId: ORG_ID,
      input: { leadId: LEAD_ID, triggerType: "FOLLOW_UP", scheduledFor: new Date("2030-01-01") },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    const auditEntries = await repository.listAuditLog(dto.id);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("FollowUpCreated");
  });

  it("syncs the Lead's next-action projection to the newly-created Follow-up", async () => {
    const scheduledFor = new Date("2030-01-01T10:00:00Z");
    await createFollowUp({
      organizationId: ORG_ID,
      input: { leadId: LEAD_ID, triggerType: "FOLLOW_UP", scheduledFor },
      actor: { actorType: "USER", actorId: "actor-1" },
    });

    expect(leadLookup.nextActionCalls).toHaveLength(1);
    expect(leadLookup.nextActionCalls[0]?.nextActionAt).toEqual(scheduledFor);
    expect(leadLookup.nextActionCalls[0]?.nextActionType).toBe("FOLLOW_UP");
  });

  it("rejects a Follow-up for a non-existent Lead", async () => {
    await expect(
      createFollowUp({
        organizationId: ORG_ID,
        input: { leadId: "does-not-exist", triggerType: "FOLLOW_UP", scheduledFor: new Date() },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidLeadReferenceError);
  });

  it("rejects assignment to a non-existent or inactive User", async () => {
    await expect(
      createFollowUp({
        organizationId: ORG_ID,
        input: {
          leadId: LEAD_ID,
          triggerType: "FOLLOW_UP",
          scheduledFor: new Date(),
          currentAssigneeUserId: "does-not-exist",
        },
        actor: { actorType: "USER", actorId: "actor-1" },
      }),
    ).rejects.toBeInstanceOf(InvalidAssigneeReferenceError);
  });
});

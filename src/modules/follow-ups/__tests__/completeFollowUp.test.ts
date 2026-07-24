import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateFollowUp } from "../application/use-cases/createFollowUp";
import { makeCompleteFollowUp } from "../application/use-cases/completeFollowUp";
import { FollowUpNotOpenError } from "../domain/errors/FollowUpErrors";
import { FakeFollowUpRepository } from "./fakeFollowUpRepository";
import { FakeLeadLookupPort, FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "org-1";
const LEAD_ID = "lead-1";
const USER_A = "user-a";

describe("completeFollowUp", () => {
  let repository: FakeFollowUpRepository;
  let leadLookup: FakeLeadLookupPort;
  let userLookup: FakeUserLookupPort;
  let createFollowUp: ReturnType<typeof makeCreateFollowUp>;
  let completeFollowUp: ReturnType<typeof makeCompleteFollowUp>;
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
    createFollowUp = makeCreateFollowUp(repository, leadLookup, leadLookup, userLookup);
    completeFollowUp = makeCompleteFollowUp(repository, leadLookup);

    const created = await createFollowUp({
      organizationId: ORG_ID,
      input: { leadId: LEAD_ID, triggerType: "FOLLOW_UP", scheduledFor: new Date("2030-01-01") },
      actor: { actorType: "USER", actorId: "actor-1" },
    });
    followUpId = created.id;
    leadLookup.nextActionCalls = [];
  });

  it("marks the Follow-up Completed with outcome notes", async () => {
    const dto = await completeFollowUp({
      id: followUpId,
      completedByUserId: USER_A,
      input: { outcomeNotes: "Customer confirmed interest." },
      actor: { actorType: "USER", actorId: USER_A },
    });

    expect(dto.status).toBe("COMPLETED");
    expect(dto.completedByUserId).toBe(USER_A);
    expect(dto.outcomeNotes).toBe("Customer confirmed interest.");
    expect(dto.completedAt).not.toBeNull();
  });

  it("clears the Lead's next-action projection when no other open Follow-up remains", async () => {
    await completeFollowUp({
      id: followUpId,
      completedByUserId: USER_A,
      input: {},
      actor: { actorType: "USER", actorId: USER_A },
    });

    expect(leadLookup.nextActionCalls).toHaveLength(1);
    expect(leadLookup.nextActionCalls[0]?.nextActionAt).toBeNull();
    expect(leadLookup.nextActionCalls[0]?.nextActionType).toBeNull();
  });

  it("records a FollowUpCompleted Audit Record", async () => {
    await completeFollowUp({
      id: followUpId,
      completedByUserId: USER_A,
      input: {},
      actor: { actorType: "USER", actorId: USER_A },
    });

    const auditEntries = await repository.listAuditLog(followUpId);
    expect(auditEntries.some((entry) => entry.action === "FollowUpCompleted")).toBe(true);
  });

  it("rejects completing an already-Completed Follow-up", async () => {
    await completeFollowUp({
      id: followUpId,
      completedByUserId: USER_A,
      input: {},
      actor: { actorType: "USER", actorId: USER_A },
    });

    await expect(
      completeFollowUp({
        id: followUpId,
        completedByUserId: USER_A,
        input: {},
        actor: { actorType: "USER", actorId: USER_A },
      }),
    ).rejects.toBeInstanceOf(FollowUpNotOpenError);
  });
});

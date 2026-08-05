import { beforeEach, describe, expect, it } from "vitest";
import { FakeFollowUpRepository } from "./fakeFollowUpRepository";
import { FakeUserLookupPort } from "./fakeLookupPorts";
import { makeProcessFollowUpLifecycle } from "../application/use-cases/processFollowUpLifecycle";
import type { DayBounds } from "../application/use-cases/processFollowUpLifecycle";

const ORG = "00000000-0000-0000-0000-000000000001";
const LEAD = "00000000-0000-0000-0000-000000000010";
const CALLER = "00000000-0000-0000-0000-000000000020";
const TEAM_LEAD = "00000000-0000-0000-0000-000000000021";
const MANAGER = "00000000-0000-0000-0000-000000000022";
const ADMIN = "00000000-0000-0000-0000-000000000023";

function dayAround(): DayBounds {
  const dayStart = new Date(Date.UTC(2026, 2, 16, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(2026, 2, 17, 0, 0, 0));
  const previousDayStart = new Date(Date.UTC(2026, 2, 15, 0, 0, 0));
  return {
    dayStart,
    dayEnd,
    dateKey: "2026-03-16",
    previousDayStart,
    previousDayEnd: dayStart,
    previousDateKey: "2026-03-15",
  };
}

describe("processFollowUpLifecycle", () => {
  let repository: FakeFollowUpRepository;
  let users: FakeUserLookupPort;
  let processLifecycle: ReturnType<typeof makeProcessFollowUpLifecycle>;

  beforeEach(() => {
    repository = new FakeFollowUpRepository();
    users = new FakeUserLookupPort();
    users.users.set(CALLER, {
      id: CALLER,
      organizationId: ORG,
      status: "ACTIVE",
    });
    users.hierarchy.set(CALLER, {
      id: CALLER,
      status: "ACTIVE",
      assignedTeamLeadId: TEAM_LEAD,
      reportingManagerId: MANAGER,
    });
    users.hierarchy.set(TEAM_LEAD, {
      id: TEAM_LEAD,
      status: "ACTIVE",
      assignedTeamLeadId: null,
      reportingManagerId: MANAGER,
    });
    users.adminIdsByOrg.set(ORG, [ADMIN]);
    processLifecycle = makeProcessFollowUpLifecycle(repository, users);
  });

  it("marks SCHEDULED follow-ups DUE and emits a reminder when scheduledFor has passed", async () => {
    const scheduledFor = new Date("2026-03-16T10:00:00.000Z");
    const now = new Date("2026-03-16T12:00:00.000Z");
    const created = await repository.createWithAudit(
      {
        organizationId: ORG,
        leadId: LEAD,
        triggerType: "FOLLOW_UP",
        scheduledFor,
        currentAssigneeUserId: CALLER,
        createdByUserId: CALLER,
      },
      { actorType: "USER", actorId: CALLER },
    );

    const result = await processLifecycle({
      organizationId: ORG,
      day: dayAround(),
      now,
    });

    expect(result.markedDue.map((f) => f.id)).toContain(created.id);
    expect((await repository.findById(created.id))?.status).toBe("DUE");
    expect(result.notifications.some((n) => n.kind === "REMINDER")).toBe(true);
    expect(result.escalated).toHaveLength(0);
  });

  it("escalates to Team Lead the next calendar day when Caller does not respond", async () => {
    const now = new Date("2026-03-16T12:00:00.000Z");
    const created = await repository.createWithAudit(
      {
        organizationId: ORG,
        leadId: LEAD,
        triggerType: "FOLLOW_UP",
        scheduledFor: new Date("2026-03-15T10:00:00.000Z"),
        currentAssigneeUserId: CALLER,
        createdByUserId: CALLER,
      },
      { actorType: "USER", actorId: CALLER },
    );

    const result = await processLifecycle({
      organizationId: ORG,
      day: dayAround(),
      now,
    });

    expect(result.markedMissed.map((f) => f.id)).toContain(created.id);
    expect(result.escalated.map((f) => f.id)).toContain(created.id);
    expect(result.notifications.some((n) => n.kind === "ESCALATION_TEAM_LEAD")).toBe(true);

    const after = await repository.findById(created.id);
    expect(after?.status).toBe("ESCALATED");
    expect(after?.escalatedToUserId).toBe(TEAM_LEAD);
    expect(after?.currentAssigneeUserId).toBe(TEAM_LEAD);
  });

  it("escalates to Manager and Admin the next day after Team Lead does not respond", async () => {
    const created = await repository.createWithAudit(
      {
        organizationId: ORG,
        leadId: LEAD,
        triggerType: "FOLLOW_UP",
        scheduledFor: new Date("2026-03-14T10:00:00.000Z"),
        currentAssigneeUserId: CALLER,
        createdByUserId: CALLER,
      },
      { actorType: "USER", actorId: CALLER },
    );

    // Day 1 after schedule: escalate to TL
    await processLifecycle({
      organizationId: ORG,
      day: {
        ...dayAround(),
        dayStart: new Date(Date.UTC(2026, 2, 15, 0, 0, 0)),
        dayEnd: new Date(Date.UTC(2026, 2, 16, 0, 0, 0)),
        dateKey: "2026-03-15",
        previousDayStart: new Date(Date.UTC(2026, 2, 14, 0, 0, 0)),
        previousDayEnd: new Date(Date.UTC(2026, 2, 15, 0, 0, 0)),
        previousDateKey: "2026-03-14",
      },
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    const afterTl = await repository.findById(created.id);
    expect(afterTl?.currentAssigneeUserId).toBe(TEAM_LEAD);
    // Simulate TL escalation happened yesterday relative to "today" (Mar 16).
    repository.followUps.set(created.id, {
      ...afterTl!,
      escalatedAt: new Date("2026-03-15T12:00:00.000Z"),
    });

    const second = await processLifecycle({
      organizationId: ORG,
      day: dayAround(),
      now: new Date("2026-03-16T12:00:00.000Z"),
    });

    expect(second.notifications.some((n) => n.kind === "ESCALATION_MANAGER")).toBe(true);
    expect(second.notifications.some((n) => n.kind === "ESCALATION_ADMIN")).toBe(true);
    expect(
      second.notifications.filter((n) => n.kind === "ESCALATION_ADMIN").map((n) => n.recipientUserId),
    ).toContain(ADMIN);

    const after = await repository.findById(created.id);
    expect(after?.escalatedToUserId).toBe(MANAGER);
    expect(after?.currentAssigneeUserId).toBe(MANAGER);
  });

  it("does not escalate on the same calendar day as the schedule", async () => {
    const scheduledFor = new Date("2026-03-16T10:00:00.000Z");
    const now = new Date("2026-03-16T22:00:00.000Z");
    const created = await repository.createWithAudit(
      {
        organizationId: ORG,
        leadId: LEAD,
        triggerType: "CALL_LATER",
        scheduledFor,
        currentAssigneeUserId: CALLER,
        createdByUserId: CALLER,
      },
      { actorType: "USER", actorId: CALLER },
    );

    const result = await processLifecycle({
      organizationId: ORG,
      day: dayAround(),
      now,
    });

    expect(result.escalated).toHaveLength(0);
    expect((await repository.findById(created.id))?.status).toBe("DUE");
    expect((await repository.findById(created.id))?.currentAssigneeUserId).toBe(CALLER);
  });
});

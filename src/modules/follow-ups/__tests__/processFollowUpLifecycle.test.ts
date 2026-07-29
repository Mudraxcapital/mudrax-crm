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
    processLifecycle = makeProcessFollowUpLifecycle(repository, users);
  });

  it("marks SCHEDULED follow-ups DUE when scheduledFor has passed", async () => {
    const now = new Date("2026-03-16T12:00:00.000Z");
    const created = await repository.createWithAudit(
      {
        organizationId: ORG,
        leadId: LEAD,
        triggerType: "FOLLOW_UP",
        scheduledFor: new Date("2026-03-16T10:00:00.000Z"),
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
  });

  it("marks FOLLOW_UP missed after the scheduled calendar day and escalates next day to Team Lead", async () => {
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
  });

  it("escalates missed CALL_LATER to Team Lead and Manager without duplicate escalation", async () => {
    const now = new Date("2026-03-16T12:00:00.000Z");
    await repository.createWithAudit(
      {
        organizationId: ORG,
        leadId: LEAD,
        triggerType: "CALL_LATER",
        scheduledFor: new Date("2026-03-16T09:00:00.000Z"),
        currentAssigneeUserId: CALLER,
        createdByUserId: CALLER,
      },
      { actorType: "USER", actorId: CALLER },
    );

    const first = await processLifecycle({
      organizationId: ORG,
      day: dayAround(),
      now,
    });
    expect(first.notifications.filter((n) => n.kind === "ESCALATION_TEAM_LEAD")).toHaveLength(1);
    expect(first.notifications.filter((n) => n.kind === "ESCALATION_MANAGER")).toHaveLength(1);

    const second = await processLifecycle({
      organizationId: ORG,
      day: dayAround(),
      now,
    });
    expect(second.escalated).toHaveLength(0);
    expect(second.notifications).toHaveLength(0);
  });
});

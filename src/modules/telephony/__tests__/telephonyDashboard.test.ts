import { beforeEach, describe, expect, it } from "vitest";
import { makeGetTelephonyDashboard } from "../application/use-cases/getTelephonyDashboard";
import { FakeCallAttemptRepository, FakeCallOutcomeRepository } from "./fakeTelephonyRepositories";
import { FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "00000000-0000-0000-0001-000000000000";
const AGENT_ID = "agent-1";

describe("getTelephonyDashboard", () => {
  let repository: FakeCallAttemptRepository;
  let callOutcomeRepository: FakeCallOutcomeRepository;
  let userLookup: FakeUserLookupPort;
  let getTelephonyDashboard: ReturnType<typeof makeGetTelephonyDashboard>;
  let now: Date;

  beforeEach(() => {
    repository = new FakeCallAttemptRepository();
    callOutcomeRepository = new FakeCallOutcomeRepository();
    userLookup = new FakeUserLookupPort();
    userLookup.users.set(AGENT_ID, {
      id: AGENT_ID,
      organizationId: ORG_ID,
      status: "ACTIVE",
      fullName: "Agent Smith",
    });
    getTelephonyDashboard = makeGetTelephonyDashboard(
      repository,
      callOutcomeRepository,
      userLookup,
    );
    now = new Date();
  });

  async function seedCall(status: "COMPLETED" | "NO_ANSWER", durationSeconds: number | null) {
    const call = await repository.createWithAudit(
      {
        organizationId: ORG_ID,
        leadId: "lead-1",
        customerId: null,
        agentUserId: AGENT_ID,
        direction: "OUTBOUND",
        status: "RINGING",
      },
      { actorType: "USER", actorId: AGENT_ID },
    );
    await repository.updateStatusWithAudit(
      call.id,
      { status, durationSeconds, endedAt: now },
      { actorType: "USER", actorId: AGENT_ID },
    );
  }

  it("counts Calls Today, Connected Calls, and Missed Calls separately", async () => {
    await seedCall("COMPLETED", 120);
    await seedCall("COMPLETED", 60);
    await seedCall("NO_ANSWER", null);

    const dashboard = await getTelephonyDashboard(ORG_ID, now);

    expect(dashboard.callsToday).toBe(3);
    expect(dashboard.connectedCallsToday).toBe(2);
    expect(dashboard.missedCallsToday).toBe(1);
    expect(dashboard.averageCallDurationSeconds).toBe(90);
  });

  it("groups Calls by Agent with the Agent's display name", async () => {
    await seedCall("COMPLETED", 60);

    const dashboard = await getTelephonyDashboard(ORG_ID, now);

    expect(dashboard.callsByAgent).toEqual([
      { agentUserId: AGENT_ID, agentName: "Agent Smith", count: 1 },
    ]);
  });

  it("returns the most Recent Calls", async () => {
    await seedCall("COMPLETED", 60);
    await seedCall("NO_ANSWER", null);

    const dashboard = await getTelephonyDashboard(ORG_ID, now);

    expect(dashboard.recentCalls).toHaveLength(2);
  });

  it("returns zeroed stats for an Organization with no Calls", async () => {
    const dashboard = await getTelephonyDashboard(ORG_ID, now);

    expect(dashboard.callsToday).toBe(0);
    expect(dashboard.connectedCallsToday).toBe(0);
    expect(dashboard.missedCallsToday).toBe(0);
    expect(dashboard.averageCallDurationSeconds).toBeNull();
    expect(dashboard.callsByAgent).toEqual([]);
    expect(dashboard.recentCalls).toEqual([]);
  });

  it("scopes dashboard metrics to a single agent when agentScope is provided", async () => {
    const otherAgent = "agent-2";
    userLookup.users.set(otherAgent, {
      id: otherAgent,
      organizationId: ORG_ID,
      status: "ACTIVE",
      fullName: "Other Agent",
    });

    await seedCall("COMPLETED", 60);
    const other = await repository.createWithAudit(
      {
        organizationId: ORG_ID,
        leadId: "lead-2",
        customerId: null,
        agentUserId: otherAgent,
        direction: "OUTBOUND",
        status: "RINGING",
      },
      { actorType: "USER", actorId: otherAgent },
    );
    await repository.updateStatusWithAudit(
      other.id,
      { status: "COMPLETED", durationSeconds: 30, endedAt: now },
      { actorType: "USER", actorId: otherAgent },
    );

    const dashboard = await getTelephonyDashboard(ORG_ID, now, { agentUserId: AGENT_ID });

    expect(dashboard.callsToday).toBe(1);
    expect(dashboard.callsByAgent).toEqual([
      { agentUserId: AGENT_ID, agentName: "Agent Smith", count: 1 },
    ]);
    expect(dashboard.recentCalls).toHaveLength(1);
    expect(dashboard.recentCalls[0]?.agentUserId).toBe(AGENT_ID);
  });
});

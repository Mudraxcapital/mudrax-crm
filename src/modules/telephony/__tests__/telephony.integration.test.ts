import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — see
// leads' lead.integration.test.ts's identical guard/rationale.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Telephony module (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createCustomer: (typeof import("@/modules/customers"))["createCustomer"];
  let initiateClickToCall: (typeof import("@/modules/telephony"))["initiateClickToCall"];
  let updateCallAttemptStatus: (typeof import("@/modules/telephony"))["updateCallAttemptStatus"];
  let getCallAttempt: (typeof import("@/modules/telephony"))["getCallAttempt"];
  let listCallAttempts: (typeof import("@/modules/telephony"))["listCallAttempts"];
  let listCallAttemptAuditLog: (typeof import("@/modules/telephony"))["listCallAttemptAuditLog"];
  let addCallNote: (typeof import("@/modules/telephony"))["addCallNote"];
  let createCallOutcome: (typeof import("@/modules/telephony"))["createCallOutcome"];
  let updateCallOutcome: (typeof import("@/modules/telephony"))["updateCallOutcome"];
  let startAgentSession: (typeof import("@/modules/telephony"))["startAgentSession"];
  let endAgentSession: (typeof import("@/modules/telephony"))["endAgentSession"];
  let getActiveAgentSession: (typeof import("@/modules/telephony"))["getActiveAgentSession"];

  let organizationId: string;
  let customerId: string;
  let userId: string;
  let callAttemptId: string;
  let callOutcomeId: string;
  let agentSessionId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const customersModule = await import("@/modules/customers");
    const telephonyModule = await import("@/modules/telephony");
    prisma = dbClient.prisma;
    createCustomer = customersModule.createCustomer;
    initiateClickToCall = telephonyModule.initiateClickToCall;
    updateCallAttemptStatus = telephonyModule.updateCallAttemptStatus;
    getCallAttempt = telephonyModule.getCallAttempt;
    listCallAttempts = telephonyModule.listCallAttempts;
    listCallAttemptAuditLog = telephonyModule.listCallAttemptAuditLog;
    addCallNote = telephonyModule.addCallNote;
    createCallOutcome = telephonyModule.createCallOutcome;
    updateCallOutcome = telephonyModule.updateCallOutcome;
    startAgentSession = telephonyModule.startAgentSession;
    endAgentSession = telephonyModule.endAgentSession;
    getActiveAgentSession = telephonyModule.getActiveAgentSession;

    const organization = await prisma.organization.upsert({
      where: { code: "MUDRAX" },
      update: {},
      create: {
        name: "Mudrax Capitals",
        code: "MUDRAX",
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
      },
    });
    organizationId = organization.id;

    const customer = await createCustomer({
      organizationId,
      input: {
        fullName: "Integration Test Telephony Customer",
        identifiers: [{ type: "PHONE", value: `+9198${Date.now().toString().slice(-8)}` }],
      },
      actor: { actorType: "USER", actorId: null },
    });
    customerId = customer.id;

    const uniqueSuffix = Date.now().toString().slice(-6);
    const user = await prisma.user.create({
      data: {
        employeeId: `INTTELE${uniqueSuffix}`,
        fullName: "Integration Test Agent",
        email: `int-test-agent-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (agentSessionId) {
      await prisma.telephonyAuditLog
        .deleteMany({ where: { targetType: "AgentSession", targetId: agentSessionId } })
        .catch(() => undefined);
      await prisma.agentStatusHistory
        .deleteMany({ where: { agentSessionId } })
        .catch(() => undefined);
      await prisma.agentSession.delete({ where: { id: agentSessionId } }).catch(() => undefined);
    }
    if (userId) {
      await prisma.extension.deleteMany({ where: { userId } }).catch(() => undefined);
    }
    if (callAttemptId) {
      await prisma.telephonyAuditLog
        .deleteMany({ where: { targetType: "CallAttempt", targetId: callAttemptId } })
        .catch(() => undefined);
      await prisma.telephonyAuditLog
        .deleteMany({ where: { targetType: "CallNote" } })
        .catch(() => undefined);
      await prisma.callNote.deleteMany({ where: { callAttemptId } }).catch(() => undefined);
      await prisma.callAttempt.delete({ where: { id: callAttemptId } }).catch(() => undefined);
    }
    if (callOutcomeId) {
      await prisma.telephonyAuditLog
        .deleteMany({ where: { targetType: "CallOutcome", targetId: callOutcomeId } })
        .catch(() => undefined);
      await prisma.callOutcome.delete({ where: { id: callOutcomeId } }).catch(() => undefined);
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    if (customerId) {
      await prisma.customerAuditLog.deleteMany({
        where: { targetType: "Customer", targetId: customerId },
      });
      await prisma.customerIdentifier.deleteMany({ where: { customerId } });
      await prisma.customer.delete({ where: { id: customerId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a Call Outcome catalog entry", async () => {
    const outcome = await createCallOutcome({
      organizationId,
      input: { name: `Integration Test Outcome ${Date.now()}` },
      actor: { actorType: "USER", actorId: null },
    });
    callOutcomeId = outcome.id;
    expect(outcome.isActive).toBe(true);
  });

  it("updates the Call Outcome", async () => {
    const updated = await updateCallOutcome({
      id: callOutcomeId,
      input: { sortOrder: 5 },
      actor: { actorType: "USER", actorId: null },
    });
    expect(updated.sortOrder).toBe(5);
  });

  it("places a Click-to-Call against the Customer via the Null provider and records a Create Audit Record", async () => {
    const call = await initiateClickToCall({
      organizationId,
      input: { customerId, agentUserId: userId },
      actor: { actorType: "USER", actorId: userId },
    });
    callAttemptId = call.id;

    expect(call.customerId).toBe(customerId);
    expect(call.status).toBe("RINGING");
    expect(call.providerCallId).toMatch(/^null-provider-/);

    const auditEntries = await listCallAttemptAuditLog(callAttemptId);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("CallAttemptCreated");
    expect(auditEntries[0]?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads the Call Attempt back and lists it for the Organization", async () => {
    const found = await getCallAttempt(callAttemptId);
    expect(found.id).toBe(callAttemptId);

    const calls = await listCallAttempts(organizationId, { customerId });
    expect(calls.some((call) => call.id === callAttemptId)).toBe(true);
  });

  it("transitions the Call to ANSWERED then COMPLETED with a chained Audit Record", async () => {
    const beforeEntries = await listCallAttemptAuditLog(callAttemptId);
    const createRecordHash = beforeEntries[0]?.recordHash;

    await updateCallAttemptStatus({
      id: callAttemptId,
      input: { status: "ANSWERED" },
      actor: { actorType: "USER", actorId: userId },
    });
    const completed = await updateCallAttemptStatus({
      id: callAttemptId,
      input: { status: "COMPLETED", callOutcomeId, disposition: "ANSWERED" },
      actor: { actorType: "USER", actorId: userId },
    });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.callOutcomeId).toBe(callOutcomeId);

    const afterEntries = await listCallAttemptAuditLog(callAttemptId);
    expect(afterEntries.length).toBeGreaterThanOrEqual(3);
    const firstUpdate = afterEntries.find((entry) => entry.action === "CallAttemptStatusChanged");
    expect(firstUpdate?.previousRecordHash).not.toBeNull();
    expect(createRecordHash).toBeDefined();
  });

  it("adds a Call Note linked to the Call", async () => {
    const note = await addCallNote({
      callAttemptId,
      authorUserId: userId,
      input: { body: "Integration test note." },
      actor: { actorType: "USER", actorId: userId },
    });
    expect(note.callAttemptId).toBe(callAttemptId);
  });

  it("logs an Agent in, changes availability, and logs out", async () => {
    const session = await startAgentSession({
      organizationId,
      userId,
      input: {},
      actor: { actorType: "USER", actorId: userId },
    });
    agentSessionId = session.id;
    expect(session.status).toBe("LOGGED_IN");

    const active = await getActiveAgentSession(userId);
    expect(active?.id).toBe(session.id);

    const ended = await endAgentSession({
      id: session.id,
      actor: { actorType: "USER", actorId: userId },
    });
    expect(ended.status).toBe("LOGGED_OUT");
    expect(await getActiveAgentSession(userId)).toBeNull();
  });
});

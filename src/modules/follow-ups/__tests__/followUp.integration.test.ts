import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — see
// customers' customer.integration.test.ts's identical guard/rationale.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Follow-up aggregate (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createCustomer: (typeof import("@/modules/customers"))["createCustomer"];
  let createLead: (typeof import("@/modules/leads"))["createLead"];
  let getLead: (typeof import("@/modules/leads"))["getLead"];
  let createFollowUp: (typeof import("@/modules/follow-ups"))["createFollowUp"];
  let completeFollowUp: (typeof import("@/modules/follow-ups"))["completeFollowUp"];
  let reassignFollowUp: (typeof import("@/modules/follow-ups"))["reassignFollowUp"];
  let listFollowUpAuditLog: (typeof import("@/modules/follow-ups"))["listFollowUpAuditLog"];
  let listFollowUpReassignmentHistory: (typeof import("@/modules/follow-ups"))["listFollowUpReassignmentHistory"];

  let organizationId: string;
  let customerId: string;
  let leadId: string;
  let followUpId: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const customersModule = await import("@/modules/customers");
    const leadsModule = await import("@/modules/leads");
    const followUpsModule = await import("@/modules/follow-ups");
    prisma = dbClient.prisma;
    createCustomer = customersModule.createCustomer;
    createLead = leadsModule.createLead;
    getLead = leadsModule.getLead;
    createFollowUp = followUpsModule.createFollowUp;
    completeFollowUp = followUpsModule.completeFollowUp;
    reassignFollowUp = followUpsModule.reassignFollowUp;
    listFollowUpAuditLog = followUpsModule.listFollowUpAuditLog;
    listFollowUpReassignmentHistory = followUpsModule.listFollowUpReassignmentHistory;

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

    const stage = await prisma.leadStage.upsert({
      where: { organizationId_name: { organizationId, name: "Integration Test - FU Fresh" } },
      update: {},
      create: {
        organizationId,
        name: "Integration Test - FU Fresh",
        bucket: "INITIAL",
        sortOrder: 910,
      },
    });
    const source = await prisma.leadSource.upsert({
      where: { organizationId_name: { organizationId, name: "Integration Test FU Source" } },
      update: {},
      create: { organizationId, name: "Integration Test FU Source" },
    });

    const customer = await createCustomer({
      organizationId,
      input: {
        fullName: "Integration Test FollowUp Customer",
        identifiers: [{ type: "PHONE", value: `+9198${Date.now().toString().slice(-8)}` }],
      },
      actor: { actorType: "USER", actorId: null },
    });
    customerId = customer.id;

    const uniqueSuffix = Date.now().toString().slice(-6);
    const userA = await prisma.user.create({
      data: {
        employeeId: `INTFU${uniqueSuffix}A`,
        fullName: "Integration Test Caller A",
        email: `int-test-fu-a-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userAId = userA.id;
    const userB = await prisma.user.create({
      data: {
        employeeId: `INTFU${uniqueSuffix}B`,
        fullName: "Integration Test Caller B",
        email: `int-test-fu-b-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userBId = userB.id;

    const lead = await createLead({
      organizationId,
      input: {
        customerId,
        leadSourceId: source.id,
        currentStageId: stage.id,
        currentAssigneeUserId: userAId,
        fullNameSnapshot: "Integration Test FollowUp Lead",
      },
      actor: { actorType: "USER", actorId: null },
    });
    leadId = lead.id;
  });

  afterAll(async () => {
    if (followUpId) {
      await prisma.followUpAuditLog.deleteMany({
        where: { targetType: "FollowUp", targetId: followUpId },
      });
      await prisma.followUpReassignment.deleteMany({ where: { followUpId } });
      await prisma.followUp.delete({ where: { id: followUpId } }).catch(() => undefined);
    }
    if (leadId) {
      await prisma.leadAuditLog.deleteMany({ where: { targetType: "Lead", targetId: leadId } });
      await prisma.leadAssignment.deleteMany({ where: { leadId } });
      await prisma.lead.delete({ where: { id: leadId } }).catch(() => undefined);
    }
    if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => undefined);
    if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => undefined);
    if (customerId) {
      await prisma.customerAuditLog.deleteMany({
        where: { targetType: "Customer", targetId: customerId },
      });
      await prisma.customerIdentifier.deleteMany({ where: { customerId } });
      await prisma.customer.delete({ where: { id: customerId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a Follow-up against the Lead and syncs the Lead's next-action projection", async () => {
    const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const created = await createFollowUp({
      organizationId,
      input: { leadId, triggerType: "FOLLOW_UP", scheduledFor },
      actor: { actorType: "USER", actorId: null },
    });
    followUpId = created.id;

    expect(created.currentAssigneeUserId).toBe(userAId);

    const lead = await getLead(leadId);
    expect(lead.nextActionAt).toBe(scheduledFor.toISOString());
    expect(lead.nextActionType).toBe("FOLLOW_UP");

    const auditEntries = await listFollowUpAuditLog(followUpId);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("FollowUpCreated");
    expect(auditEntries[0]?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reassigns the Follow-up to another User and records history", async () => {
    const reassigned = await reassignFollowUp({
      id: followUpId,
      input: { toUserId: userBId, reason: "Coverage" },
      actor: { actorType: "USER", actorId: null },
    });

    expect(reassigned.currentAssigneeUserId).toBe(userBId);
    const history = await listFollowUpReassignmentHistory(followUpId);
    expect(history).toHaveLength(1);
    expect(history[0]?.toUserId).toBe(userBId);
  });

  it("completes the Follow-up and clears the Lead's next-action projection", async () => {
    const completed = await completeFollowUp({
      id: followUpId,
      completedByUserId: userBId,
      input: { outcomeNotes: "Confirmed via integration test." },
      actor: { actorType: "USER", actorId: null },
    });

    expect(completed.status).toBe("COMPLETED");

    const lead = await getLead(leadId);
    expect(lead.nextActionAt).toBeNull();
    expect(lead.nextActionType).toBeNull();

    const auditEntries = await listFollowUpAuditLog(followUpId);
    expect(auditEntries.some((entry) => entry.action === "FollowUpCompleted")).toBe(true);
  });
});

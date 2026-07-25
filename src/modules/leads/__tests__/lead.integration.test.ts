import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — see
// customers' customer.integration.test.ts's identical guard/rationale.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Lead aggregate (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createCustomer: (typeof import("@/modules/customers"))["createCustomer"];
  let createLead: (typeof import("@/modules/leads"))["createLead"];
  let updateLead: (typeof import("@/modules/leads"))["updateLead"];
  let getLead: (typeof import("@/modules/leads"))["getLead"];
  let changeLeadStage: (typeof import("@/modules/leads"))["changeLeadStage"];
  let assignLead: (typeof import("@/modules/leads"))["assignLead"];
  let listLeadAuditLog: (typeof import("@/modules/leads"))["listLeadAuditLog"];
  let listLeadAssignmentHistory: (typeof import("@/modules/leads"))["listLeadAssignmentHistory"];

  let organizationId: string;
  let customerId: string;
  let leadId: string;
  let stageNewId: string;
  let stageWonId: string;
  let sourceId: string;
  let userId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const customersModule = await import("@/modules/customers");
    const leadsModule = await import("@/modules/leads");
    prisma = dbClient.prisma;
    createCustomer = customersModule.createCustomer;
    createLead = leadsModule.createLead;
    updateLead = leadsModule.updateLead;
    getLead = leadsModule.getLead;
    changeLeadStage = leadsModule.changeLeadStage;
    assignLead = leadsModule.assignLead;
    listLeadAuditLog = leadsModule.listLeadAuditLog;
    listLeadAssignmentHistory = leadsModule.listLeadAssignmentHistory;

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

    const stageNew = await prisma.leadStage.upsert({
      where: { organizationId_name: { organizationId, name: "Integration Test - Fresh" } },
      update: {},
      create: {
        organizationId,
        name: "Integration Test - Fresh",
        bucket: "INITIAL",
        sortOrder: 900,
      },
    });
    stageNewId = stageNew.id;

    const stageWon = await prisma.leadStage.upsert({
      where: { organizationId_name: { organizationId, name: "Integration Test - Won" } },
      update: {},
      create: {
        organizationId,
        name: "Integration Test - Won",
        bucket: "CLOSED",
        closeOutcome: "WON",
        sortOrder: 901,
      },
    });
    stageWonId = stageWon.id;

    const source = await prisma.leadSource.upsert({
      where: { organizationId_name: { organizationId, name: "Integration Test Source" } },
      update: {},
      create: { organizationId, name: "Integration Test Source" },
    });
    sourceId = source.id;

    const customer = await createCustomer({
      organizationId,
      input: {
        fullName: "Integration Test Lead Customer",
        identifiers: [{ type: "PHONE", value: `+9199${Date.now().toString().slice(-8)}` }],
      },
      actor: { actorType: "USER", actorId: null },
    });
    customerId = customer.id;

    const uniqueSuffix = Date.now().toString().slice(-6);
    const user = await prisma.user.create({
      data: {
        employeeId: `INTTEST${uniqueSuffix}`,
        fullName: "Integration Test Caller",
        email: `int-test-caller-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (leadId) {
      await prisma.leadAuditLog.deleteMany({ where: { targetType: "Lead", targetId: leadId } });
      await prisma.leadAssignment.deleteMany({ where: { leadId } });
      await prisma.lead.delete({ where: { id: leadId } }).catch(() => undefined);
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

  it("creates a Lead against the Customer and records a Create Audit Record", async () => {
    const created = await createLead({
      organizationId,
      input: {
        customerId,
        leadSourceId: sourceId,
        currentStageId: stageNewId,
        fullNameSnapshot: "Integration Test Lead",
      },
      actor: { actorType: "USER", actorId: null },
    });
    leadId = created.id;

    expect(created.currentStageId).toBe(stageNewId);

    const auditEntries = await listLeadAuditLog(leadId);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.action).toBe("LeadCreated");
    expect(auditEntries[0]?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads the Lead back via getLead", async () => {
    const found = await getLead(leadId);
    expect(found.id).toBe(leadId);
    expect(found.customerId).toBe(customerId);
  });

  it("updates the Lead and records a chained Update Audit Record", async () => {
    const beforeEntries = await listLeadAuditLog(leadId);
    const createRecordHash = beforeEntries[0]?.recordHash;

    const updated = await updateLead({
      id: leadId,
      input: { fullNameSnapshot: "Integration Test Lead (renamed)" },
      actor: { actorType: "USER", actorId: null },
    });

    expect(updated.fullNameSnapshot).toBe("Integration Test Lead (renamed)");

    const afterEntries = await listLeadAuditLog(leadId);
    const updateEntry = afterEntries.find((entry) => entry.action === "LeadUpdated");
    expect(updateEntry?.previousRecordHash).toBe(createRecordHash);
  });

  it("assigns the Lead to a User and records the assignment history", async () => {
    const assigned = await assignLead({
      id: leadId,
      input: { assignedToUserId: userId },
      actor: { actorType: "USER", actorId: null },
    });
    expect(assigned.currentAssigneeUserId).toBe(userId);

    const history = await listLeadAssignmentHistory(leadId);
    expect(history).toHaveLength(1);
    expect(history[0]?.assignmentType).toBe("INITIAL");
  });

  it("changes the Lead's Stage to a Closed-Won Stage and sets wonAt", async () => {
    const changed = await changeLeadStage({
      id: leadId,
      input: { stageId: stageWonId },
      actor: { actorType: "USER", actorId: null },
    });

    expect(changed.currentStageId).toBe(stageWonId);
    expect(changed.wonAt).not.toBeNull();

    const auditEntries = await listLeadAuditLog(leadId);
    expect(auditEntries.some((entry) => entry.action === "LeadStageChanged")).toBe(true);
  });
});

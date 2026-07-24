import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real, running Postgres instance — see
// customers' customer.integration.test.ts's identical guard/rationale.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Campaign aggregate (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let createCustomer: (typeof import("@/modules/customers"))["createCustomer"];
  let createLead: (typeof import("@/modules/leads"))["createLead"];
  let getLead: (typeof import("@/modules/leads"))["getLead"];
  let createCampaign: (typeof import("@/modules/campaigns"))["createCampaign"];
  let changeCampaignStatus: (typeof import("@/modules/campaigns"))["changeCampaignStatus"];
  let addCampaignMember: (typeof import("@/modules/campaigns"))["addCampaignMember"];
  let assignCampaignLeads: (typeof import("@/modules/campaigns"))["assignCampaignLeads"];
  let listCampaignAuditLog: (typeof import("@/modules/campaigns"))["listCampaignAuditLog"];
  let getCampaignStatistics: (typeof import("@/modules/campaigns"))["getCampaignStatistics"];

  let organizationId: string;
  let customerId: string;
  let leadAId: string;
  let leadBId: string;
  let campaignId: string;
  let userAId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const customersModule = await import("@/modules/customers");
    const leadsModule = await import("@/modules/leads");
    const campaignsModule = await import("@/modules/campaigns");
    prisma = dbClient.prisma;
    createCustomer = customersModule.createCustomer;
    createLead = leadsModule.createLead;
    getLead = leadsModule.getLead;
    createCampaign = campaignsModule.createCampaign;
    changeCampaignStatus = campaignsModule.changeCampaignStatus;
    addCampaignMember = campaignsModule.addCampaignMember;
    assignCampaignLeads = campaignsModule.assignCampaignLeads;
    listCampaignAuditLog = campaignsModule.listCampaignAuditLog;
    getCampaignStatistics = campaignsModule.getCampaignStatistics;

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
      where: { organizationId_name: { organizationId, name: "Integration Test - Campaign Fresh" } },
      update: {},
      create: {
        organizationId,
        name: "Integration Test - Campaign Fresh",
        bucket: "INITIAL",
        sortOrder: 920,
      },
    });
    const source = await prisma.leadSource.upsert({
      where: { organizationId_name: { organizationId, name: "Integration Test Campaign Source" } },
      update: {},
      create: { organizationId, name: "Integration Test Campaign Source" },
    });

    const customer = await createCustomer({
      organizationId,
      input: {
        fullName: "Integration Test Campaign Customer",
        identifiers: [{ type: "PHONE", value: `+9197${Date.now().toString().slice(-8)}` }],
      },
      actor: { actorType: "USER", actorId: null },
    });
    customerId = customer.id;

    const uniqueSuffix = Date.now().toString().slice(-6);
    const userA = await prisma.user.create({
      data: {
        organizationId,
        employeeCode: `INTCM${uniqueSuffix}A`,
        fullName: "Integration Test Campaign Caller",
        email: `int-test-cm-a-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userAId = userA.id;

    const leadA = await createLead({
      organizationId,
      input: {
        customerId,
        leadSourceId: source.id,
        currentStageId: stage.id,
        fullNameSnapshot: "Integration Test Campaign Lead A",
      },
      actor: { actorType: "USER", actorId: null },
    });
    leadAId = leadA.id;

    const leadB = await createLead({
      organizationId,
      input: {
        customerId,
        leadSourceId: source.id,
        currentStageId: stage.id,
        fullNameSnapshot: "Integration Test Campaign Lead B",
      },
      actor: { actorType: "USER", actorId: null },
    });
    leadBId = leadB.id;
  });

  afterAll(async () => {
    if (campaignId) {
      await prisma.campaignAuditLog.deleteMany({
        where: { OR: [{ targetType: "Campaign", targetId: campaignId }] },
      });
      await prisma.campaignAssignmentAllocation.deleteMany({
        where: { campaignAssignment: { campaignId } },
      });
      await prisma.campaignAssignment.deleteMany({ where: { campaignId } });
      await prisma.campaignMembership.deleteMany({ where: { campaignId } });
      await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => undefined);
    }
    for (const leadId of [leadAId, leadBId]) {
      if (!leadId) continue;
      await prisma.leadAuditLog.deleteMany({ where: { targetType: "Lead", targetId: leadId } });
      await prisma.leadAssignment.deleteMany({ where: { leadId } });
      await prisma.lead.delete({ where: { id: leadId } }).catch(() => undefined);
    }
    if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => undefined);
    if (customerId) {
      await prisma.customerAuditLog.deleteMany({
        where: { targetType: "Customer", targetId: customerId },
      });
      await prisma.customerIdentifier.deleteMany({ where: { customerId } });
      await prisma.customer.delete({ where: { id: customerId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a Campaign, adds a member, and records a CampaignCreated Audit Record", async () => {
    const created = await createCampaign({
      organizationId,
      input: { name: "Integration Test Campaign" },
      actor: { actorType: "USER", actorId: userAId },
    });
    campaignId = created.id;
    expect(created.status).toBe("DRAFT");

    await addCampaignMember({
      campaignId,
      input: { userId: userAId },
      actor: { actorType: "USER", actorId: userAId },
    });

    const auditEntries = await listCampaignAuditLog(campaignId);
    expect(auditEntries.some((entry) => entry.action === "CampaignCreated")).toBe(true);
    expect(auditEntries[0]?.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("moves the Campaign to ACTIVE", async () => {
    const updated = await changeCampaignStatus({
      id: campaignId,
      input: { status: "ACTIVE" },
      actor: { actorType: "USER", actorId: userAId },
    });
    expect(updated.status).toBe("ACTIVE");
  });

  it("assigns Leads to the active member via the real leads.assignLead call", async () => {
    const assignment = await assignCampaignLeads({
      campaignId,
      input: { leadIds: [leadAId, leadBId], allocationMethod: "EQUAL" },
      actor: { actorType: "USER", actorId: userAId },
    });

    expect(assignment.status).toBe("COMPLETED");

    const leadA = await getLead(leadAId);
    const leadB = await getLead(leadBId);
    expect(leadA.currentAssigneeUserId).toBe(userAId);
    expect(leadB.currentAssigneeUserId).toBe(userAId);

    const statistics = await getCampaignStatistics(campaignId);
    expect(statistics.totalLeadsAllocated).toBe(2);
    expect(statistics.completedAssignmentBatches).toBe(1);
  });
});

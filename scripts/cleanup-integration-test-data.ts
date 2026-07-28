/**
 * 1) Ensure default Lead Source "Data" exists; remove "Bank Partner Referral".
 * 2) Remove leftover rows whose name contains "Integration Test".
 *
 * Usage: npx tsx scripts/cleanup-integration-test-data.ts
 */

import "dotenv/config";
import { prisma } from "../src/infra/db/client";

const INTEGRATION_TEST = { contains: "Integration Test", mode: "insensitive" as const };

async function ensureDataSourceAndRemoveBankPartner(): Promise<void> {
  const orgs = await prisma.organization.findMany({ select: { id: true } });

  for (const org of orgs) {
    const dataSource = await prisma.leadSource.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Data" } },
      update: { isActive: true },
      create: { organizationId: org.id, name: "Data", isActive: true },
    });

    const bankPartner = await prisma.leadSource.findUnique({
      where: {
        organizationId_name: { organizationId: org.id, name: "Bank Partner Referral" },
      },
    });

    if (!bankPartner) continue;

    const leadsMoved = await prisma.lead.updateMany({
      where: { leadSourceId: bankPartner.id },
      data: { leadSourceId: dataSource.id },
    });
    const batchesMoved = await prisma.importBatch.updateMany({
      where: { leadSourceId: bankPartner.id },
      data: { leadSourceId: dataSource.id },
    });

    await prisma.leadSource.delete({ where: { id: bankPartner.id } });

    console.log("Bank Partner Referral removed:", {
      organizationId: org.id,
      leadsMoved: leadsMoved.count,
      importBatchesMoved: batchesMoved.count,
      defaultSourceId: dataSource.id,
    });
  }
}

async function cleanupIntegrationTestRows(): Promise<void> {
  const testStages = await prisma.leadStage.findMany({
    where: { name: INTEGRATION_TEST },
    select: { id: true },
  });
  const testSources = await prisma.leadSource.findMany({
    where: { name: INTEGRATION_TEST },
    select: { id: true },
  });
  const stageIds = testStages.map((row) => row.id);
  const sourceIds = testSources.map((row) => row.id);

  const leadWhere = {
    OR: [
      ...(stageIds.length ? [{ currentStageId: { in: stageIds } }] : []),
      ...(sourceIds.length ? [{ leadSourceId: { in: sourceIds } }] : []),
      { fullNameSnapshot: INTEGRATION_TEST },
    ],
  };

  let leadsDeleted = 0;
  if (leadWhere.OR.length > 0) {
    // Clear dependent rows that reference leads before delete.
    const testLeads = await prisma.lead.findMany({
      where: leadWhere,
      select: { id: true },
    });
    const leadIds = testLeads.map((row) => row.id);
    if (leadIds.length) {
      await prisma.followUp.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => undefined);
      await prisma.leadNote.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => undefined);
      await prisma.leadAssignment.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => undefined);
      await prisma.leadTag.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => undefined);
      await prisma.leadCallFeedback.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => undefined);
      await prisma.leadCustomFieldValue
        .deleteMany({ where: { leadId: { in: leadIds } } })
        .catch(() => undefined);
      const deleted = await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
      leadsDeleted = deleted.count;
    }
  }

  const stages = await prisma.leadStage.deleteMany({ where: { name: INTEGRATION_TEST } });
  const sources = await prisma.leadSource.deleteMany({ where: { name: INTEGRATION_TEST } });
  const lostReasons = await prisma.lostReason
    .deleteMany({ where: { name: INTEGRATION_TEST } })
    .catch(() => ({ count: 0 }));
  const tags = await prisma.tag
    .deleteMany({ where: { name: INTEGRATION_TEST } })
    .catch(() => ({ count: 0 }));
  const callFeedback = await prisma.callFeedbackStatus
    .deleteMany({ where: { name: INTEGRATION_TEST } })
    .catch(() => ({ count: 0 }));
  const outcomes = await prisma.callOutcome
    .deleteMany({ where: { name: INTEGRATION_TEST } })
    .catch(() => ({ count: 0 }));
  const campaigns = await prisma.campaign.deleteMany({ where: { name: INTEGRATION_TEST } });

  const customers = await prisma.customer.deleteMany({
    where: { fullName: INTEGRATION_TEST },
  });

  // Soft-disable leftover integration-test users (hard delete can break FK history).
  const users = await prisma.user.updateMany({
    where: { fullName: INTEGRATION_TEST, status: { not: "INACTIVE" } },
    data: { status: "INACTIVE" },
  });

  console.log("Integration Test cleanup:", {
    leads: leadsDeleted,
    leadStages: stages.count,
    leadSources: sources.count,
    lostReasons: lostReasons.count,
    tags: tags.count,
    callFeedbackStatuses: callFeedback.count,
    callOutcomes: outcomes.count,
    campaigns: campaigns.count,
    customers: customers.count,
    usersDisabled: users.count,
  });
}

async function main(): Promise<void> {
  await ensureDataSourceAndRemoveBankPartner();
  await cleanupIntegrationTestRows();

  const remainingSources = await prisma.leadSource.findMany({
    select: { name: true, isActive: true },
    orderBy: { name: "asc" },
  });
  console.log(
    "Lead sources now:",
    remainingSources.map((row) => row.name),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

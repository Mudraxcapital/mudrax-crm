/**
 * Removes leftover "Integration Test*" catalog / demo rows created by
 * integration tests that ran against a shared database.
 *
 * Usage: npx tsx scripts/cleanup-integration-test-data.ts
 */

import { prisma } from "../src/infra/db/client";

async function main() {
  const pattern = { startsWith: "Integration Test", mode: "insensitive" as const };

  // Delete leads that still reference Integration Test stages/sources first.
  const testStages = await prisma.leadStage.findMany({
    where: { name: pattern },
    select: { id: true },
  });
  const testSources = await prisma.leadSource.findMany({
    where: { name: pattern },
    select: { id: true },
  });
  const stageIds = testStages.map((row) => row.id);
  const sourceIds = testSources.map((row) => row.id);

  if (stageIds.length || sourceIds.length) {
    await prisma.lead.deleteMany({
      where: {
        OR: [
          stageIds.length ? { currentStageId: { in: stageIds } } : undefined,
          sourceIds.length ? { leadSourceId: { in: sourceIds } } : undefined,
          { fullNameSnapshot: pattern },
        ].filter(Boolean) as { currentStageId?: { in: string[] }; leadSourceId?: { in: string[] }; fullNameSnapshot?: typeof pattern }[],
      },
    });
  }

  const stages = await prisma.leadStage.deleteMany({ where: { name: pattern } });
  const sources = await prisma.leadSource.deleteMany({ where: { name: pattern } });
  const outcomes = await prisma.callOutcome.deleteMany({ where: { name: pattern } });
  const campaigns = await prisma.campaign.deleteMany({ where: { name: pattern } });

  const users = await prisma.user.updateMany({
    where: { fullName: pattern, status: { not: "INACTIVE" } },
    data: { status: "INACTIVE" },
  });

  console.log("Cleanup complete:", {
    leadStages: stages.count,
    leadSources: sources.count,
    callOutcomes: outcomes.count,
    campaigns: campaigns.count,
    usersDisabled: users.count,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

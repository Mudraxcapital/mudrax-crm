// ============================================================================
// Ensures Do Not Disturb Active stage + system campaign exist.
// Safe to re-run after db:reset-crm (which wipes campaigns).
// ============================================================================

import { StageBucket, type PrismaClient } from "@prisma/client";
import { seedDndCampaign } from "./steps/04b-dnd-campaign";

export async function ensureDoNotDisturb(
  prisma: PrismaClient,
): Promise<{ stageId: string; campaignId: string }> {
  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error("No organization found. Run a full seed first.");
  }

  const stage = await prisma.leadStage.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Do Not Disturb" },
    },
    update: {
      bucket: StageBucket.ACTIVE,
      isActive: true,
      sortOrder: 13,
      closeOutcome: null,
    },
    create: {
      organizationId: org.id,
      name: "Do Not Disturb",
      bucket: StageBucket.ACTIVE,
      sortOrder: 13,
      isActive: true,
    },
  });

  const managerRole = await prisma.role.findFirst({ where: { name: "Manager" } });
  const adminRole = await prisma.role.findFirst({ where: { name: "Admin" } });
  const managerAssignment = managerRole
    ? await prisma.userRole.findFirst({ where: { roleId: managerRole.id } })
    : null;
  const adminAssignment = adminRole
    ? await prisma.userRole.findFirst({ where: { roleId: adminRole.id } })
    : null;

  const ownerManagerId = managerAssignment?.userId ?? adminAssignment?.userId;
  const createdByUserId = adminAssignment?.userId ?? ownerManagerId;
  if (!ownerManagerId || !createdByUserId) {
    throw new Error("No Manager/Admin user found to own the Do Not Disturb campaign.");
  }

  const campaignId = await seedDndCampaign(
    prisma,
    org.id,
    ownerManagerId,
    createdByUserId,
  );

  return { stageId: stage.id, campaignId };
}

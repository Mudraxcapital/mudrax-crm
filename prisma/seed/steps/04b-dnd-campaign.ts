// ============================================================================
// Ensures the org has an ACTIVE "Do Not Disturb" campaign for DND leads.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

const DND_CAMPAIGN_NAME = "Do Not Disturb";

export async function seedDndCampaign(
  prisma: PrismaClient,
  organizationId: string,
  ownerManagerId: string,
  createdByUserId: string,
): Promise<string> {
  section("4b. Do Not Disturb campaign");
  explain(
    "System campaign that stores leads marked Do Not Disturb; Excel import skips contacts already here.",
  );

  const existing = await prisma.campaign.findFirst({
    where: {
      organizationId,
      name: { equals: DND_CAMPAIGN_NAME, mode: "insensitive" },
    },
  });

  if (existing) {
    if (existing.status !== "ACTIVE") {
      await prisma.campaign.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });
    }
    summary("Do Not Disturb campaign ready", 1);
    return existing.id;
  }

  const created = await prisma.campaign.create({
    data: {
      organizationId,
      name: DND_CAMPAIGN_NAME,
      description:
        "System campaign for leads marked Do Not Disturb. Import skips contacts already here.",
      status: "ACTIVE",
      createdByUserId,
      ownerManagerId,
    },
  });

  summary("Do Not Disturb campaign created", 1);
  return created.id;
}
